import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import type { TerritoryClaim } from '~~/shared/utils/types';

type CancelBody = { territoryId?: number };
type CancelHandler = (event: H3Event) => Promise<{ success: boolean; newTotal: number }>;

// 1. Stub Globals
vi.stubGlobal('defineEventHandler', (fn: CancelHandler) => fn);
vi.stubGlobal('useRuntimeConfig', () => ({ stripeSecretKey: 'sk_test_123' }));
vi.stubGlobal('getRequestHeader', () => 'Bearer test_token');
vi.stubGlobal(
  'createError',
  (err: { message?: string; statusMessage?: string; statusCode?: number }) =>
    new Error(err.message || err.statusMessage)
);

let requestBody: CancelBody = {};
vi.stubGlobal('readBody', async (): Promise<CancelBody> => requestBody);

// 2. Mock external dependencies
const {
  mockVerifyIdToken,
  mockPricingGet,
  mockUserGet,
  mockUserRefUpdate,
  mockClaimGet,
  mockGetFirestore,
  mockSubRetrieve,
  mockSubUpdate,
  mockSubCancel,
  mockBatchUpdate,
  mockBatchDelete,
  mockBatchCommit
} = vi.hoisted(() => {
  const mockPricingGet = vi.fn();
  const mockUserGet = vi.fn();
  const mockUserRefUpdate = vi.fn();
  const mockClaimGet = vi.fn();
  const mockBatchUpdate = vi.fn();
  const mockBatchDelete = vi.fn();
  const mockBatchCommit = vi.fn();

  const mockCollection = vi.fn((path: string) => {
    if (path === 'platform_settings') {
      return { doc: (): { get: typeof mockPricingGet } => ({ get: mockPricingGet }) };
    }
    if (path === 'users') {
      return {
        doc: (): { get: typeof mockUserGet; update: typeof mockUserRefUpdate } => ({
          get: mockUserGet,
          update: mockUserRefUpdate
        })
      };
    }
    if (path === 'territory_category_owners') {
      return { doc: (): { get: typeof mockClaimGet } => ({ get: mockClaimGet }) };
    }
    return { doc: (): { get: ReturnType<typeof vi.fn> } => ({ get: vi.fn() }) };
  });

  return {
    mockVerifyIdToken: vi.fn(),
    mockPricingGet,
    mockUserGet,
    mockUserRefUpdate,
    mockClaimGet,
    mockGetFirestore: vi.fn(() => ({
      collection: mockCollection,
      batch: (): {
        update: typeof mockBatchUpdate;
        delete: typeof mockBatchDelete;
        commit: typeof mockBatchCommit;
      } => ({
        update: mockBatchUpdate,
        delete: mockBatchDelete,
        commit: mockBatchCommit
      })
    })),
    mockSubRetrieve: vi.fn(),
    mockSubUpdate: vi.fn(),
    mockSubCancel: vi.fn(),
    mockBatchUpdate,
    mockBatchDelete,
    mockBatchCommit
  };
});

vi.mock('stripe', () => ({
  default: class Stripe {
    subscriptions = {
      retrieve: mockSubRetrieve,
      update: mockSubUpdate,
      cancel: mockSubCancel
    };
  }
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: (): { verifyIdToken: typeof mockVerifyIdToken } => ({
    verifyIdToken: mockVerifyIdToken
  })
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: mockGetFirestore,
  FieldValue: {
    delete: vi.fn(() => 'FIELD_DELETE'),
    arrayRemove: vi.fn((id: string) => `ARRAY_REMOVE(${id})`)
  }
}));

const wellFormedPricing = {
  UK: {
    band1: { basic: 50, exclusive: 250 },
    band2: { basic: 30, exclusive: 150 },
    band3: { basic: 20, exclusive: 100 },
    band4: { basic: 10, exclusive: 50 },
    band5: { basic: 5, exclusive: 25 }
  },
  USA: {
    band1: { basic: 60, exclusive: 300 },
    band2: { basic: 40, exclusive: 200 },
    band3: { basic: 25, exclusive: 125 },
    band4: { basic: 15, exclusive: 75 },
    band5: { basic: 10, exclusive: 50 }
  }
};

const makeTerritory = (overrides: Partial<TerritoryClaim> = {}): TerritoryClaim => ({
  territoryId: 999,
  categoryValue: 'IT',
  isBasic: true,
  exclusiveMonths: [],
  band: 1,
  ...overrides
});

describe('cancel-territory', () => {
  let handler: CancelHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../cancel-territory.post');
    handler = mod.default;

    requestBody = { territoryId: 999 };

    mockVerifyIdToken.mockResolvedValue({ uid: 'user_123' });
    mockPricingGet.mockResolvedValue({ exists: true, data: () => wellFormedPricing });
    mockClaimGet.mockResolvedValue({ exists: false });
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        activeTerritories: [makeTerritory({ territoryId: 999, isBasic: true, band: 1 })]
      })
    });
    mockSubRetrieve.mockResolvedValue({
      items: { data: [{ id: 'si_123', price: { product: 'prod_123' } }] }
    });
    mockSubUpdate.mockResolvedValue({});
  });

  it('resolves normal pricing and downgrades the subscription when the pricing document is well-formed', async () => {
    // Two basic territories left after cancelling one: this one (band1, UK -> 50) stays basic.
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        activeTerritories: [
          makeTerritory({ territoryId: 999, isBasic: true, band: 1 }),
          makeTerritory({ territoryId: 1000, isBasic: true, band: 1 })
        ]
      })
    });
    requestBody = { territoryId: 999 };

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ success: true, newTotal: 50 });
    expect(mockSubUpdate).toHaveBeenCalledWith(
      'sub_123',
      expect.objectContaining({
        items: [
          expect.objectContaining({
            id: 'si_123',
            price_data: expect.objectContaining({ unit_amount: 5000 })
          })
        ]
      })
    );
    expect(mockSubCancel).not.toHaveBeenCalled();
  });

  it('throws a 500 and does not push anything to Stripe when platform_settings/pricing is missing the caller billing country', async () => {
    mockPricingGet.mockResolvedValue({
      exists: true,
      data: () => ({ USA: wellFormedPricing.USA })
    });
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        activeTerritories: [makeTerritory({ territoryId: 999, isBasic: true, band: 1 })]
      })
    });

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Pricing bands for UK not found.');
    expect(mockSubUpdate).not.toHaveBeenCalled();
    expect(mockSubCancel).not.toHaveBeenCalled();
  });

  it('resolves USD pricing and throws a 500 the same way when the caller billing country is USA but missing from pricing', async () => {
    mockPricingGet.mockResolvedValue({
      exists: true,
      data: () => ({ UK: wellFormedPricing.UK })
    });
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'USA',
        stripeSubscriptionId: 'sub_123',
        activeTerritories: [makeTerritory({ territoryId: 999, isBasic: true, band: 1 })]
      })
    });

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Pricing bands for USA not found.');
    expect(mockSubUpdate).not.toHaveBeenCalled();
    expect(mockSubCancel).not.toHaveBeenCalled();
  });

  it('resolves normal USD pricing when the pricing document has a well-formed USA entry', async () => {
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'USA',
        stripeSubscriptionId: 'sub_123',
        activeTerritories: [
          makeTerritory({ territoryId: 999, isBasic: true, band: 1 }),
          makeTerritory({ territoryId: 1000, isBasic: true, band: 1 })
        ]
      })
    });
    requestBody = { territoryId: 999 };

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ success: true, newTotal: 60 });
    expect(mockSubUpdate).toHaveBeenCalledWith(
      'sub_123',
      expect.objectContaining({
        items: [
          expect.objectContaining({
            id: 'si_123',
            price_data: expect.objectContaining({ currency: 'usd', unit_amount: 6000 })
          })
        ]
      })
    );
  });

  it('throws a 500 and does not push anything to Stripe when the resolved band is missing from the country pricing', async () => {
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        activeTerritories: [
          makeTerritory({ territoryId: 999, isBasic: true, band: 1 }),
          makeTerritory({ territoryId: 1000, isBasic: true, band: 42 })
        ]
      })
    });
    requestBody = { territoryId: 999 };

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Pricing band band42 for UK not found.');
    expect(mockSubUpdate).not.toHaveBeenCalled();
    expect(mockSubCancel).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request with a 401', async () => {
    vi.stubGlobal('getRequestHeader', () => undefined);
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Unauthorized');

    vi.stubGlobal('getRequestHeader', () => 'Bearer test_token');
  });

  it('rejects with a 404 when the authenticated user has no Firestore document', async () => {
    mockUserGet.mockResolvedValue({ data: () => undefined });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('User not found');
  });

  it('falls back to the built-in DEFAULT_PRICING and UK billing country when both are unset', async () => {
    mockPricingGet.mockResolvedValue({ exists: false });
    mockUserGet.mockResolvedValue({
      data: () => ({
        stripeSubscriptionId: 'sub_123',
        activeTerritories: [makeTerritory({ territoryId: 999, isBasic: true, band: 1 })]
      })
    });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    // Only territory cancelled and it had no exclusiveMonths, so nothing basic remains: total is 0.
    expect(res.newTotal).toBe(0);
    expect(mockSubCancel).toHaveBeenCalledWith('sub_123');
  });

  it('applies basicDiscount as a percentage reduction on the resolved band price', async () => {
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        basicDiscount: 20,
        activeTerritories: [
          makeTerritory({ territoryId: 999, isBasic: true, band: 1 }),
          makeTerritory({ territoryId: 1000, isBasic: true, band: 1 })
        ]
      })
    });
    requestBody = { territoryId: 999 };

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    // band1 basic = 50, 20% off = 40
    expect(res.newTotal).toBe(40);
  });

  it('cancels the Stripe subscription entirely and clears stripeSubscriptionId when the new total is 0', async () => {
    // Cancelling the only basic territory (no other basics remain) drives newMonthlyTotal to 0.
    requestBody = { territoryId: 999 };

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.newTotal).toBe(0);
    expect(mockSubCancel).toHaveBeenCalledWith('sub_123');
    expect(mockUserRefUpdate).toHaveBeenCalledWith({ stripeSubscriptionId: null });
    expect(mockSubUpdate).not.toHaveBeenCalled();
  });

  it('wraps a Stripe API failure in a 500 without touching Firestore', async () => {
    mockSubCancel.mockRejectedValueOnce(new Error('stripe down'));
    requestBody = { territoryId: 999 };

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to update billing with Stripe.');
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('skips Stripe entirely when the user has no stripeSubscriptionId', async () => {
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        activeTerritories: [makeTerritory({ territoryId: 999, isBasic: true, band: 1 })]
      })
    });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ success: true, newTotal: 0 });
    expect(mockSubRetrieve).not.toHaveBeenCalled();
    expect(mockSubCancel).not.toHaveBeenCalled();
    expect(mockSubUpdate).not.toHaveBeenCalled();
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it('deletes the territory_category_owners claim doc once no exclusive months or basic owners remain', async () => {
    mockClaimGet.mockResolvedValue({
      exists: true,
      data: () => ({
        takenExclusiveMonths: { '2026-01': 'user_123' },
        basicOwners: ['user_123']
      })
    });
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        activeTerritories: [
          makeTerritory({
            territoryId: 999,
            isBasic: true,
            exclusiveMonths: ['2026-01'],
            band: 1
          })
        ]
      })
    });

    const event = {} as unknown as H3Event;
    await handler(event);

    expect(mockBatchDelete).toHaveBeenCalled();
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1); // only the user-doc update, not the claim doc
  });

  it("surgically removes only this user's claim fields when other owners remain on the claim doc", async () => {
    mockClaimGet.mockResolvedValue({
      exists: true,
      data: () => ({
        takenExclusiveMonths: { '2026-01': 'user_123', '2026-02': 'other_user' },
        basicOwners: ['user_123', 'other_user']
      })
    });
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        activeTerritories: [
          makeTerritory({
            territoryId: 999,
            isBasic: true,
            exclusiveMonths: ['2026-01'],
            band: 1
          })
        ]
      })
    });

    const event = {} as unknown as H3Event;
    await handler(event);

    expect(mockBatchDelete).not.toHaveBeenCalled();
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        'takenExclusiveMonths.2026-01': 'FIELD_DELETE',
        basicOwners: 'ARRAY_REMOVE(user_123)'
      })
    );
  });

  it('adds a flat Band 1 national charge on top of remaining local territories when ukNationalStatus is active', async () => {
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        ukNationalStatus: 'active',
        activeTerritories: [
          makeTerritory({ territoryId: 999, isBasic: true, band: 1 }),
          makeTerritory({ territoryId: 1000, isBasic: true, band: 1 })
        ]
      })
    });
    requestBody = { territoryId: 999 };

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    // Remaining local territory (band1, 50) + flat national charge (band1, 50) = 100
    expect(res).toEqual({ success: true, newTotal: 100 });
  });

  it('excludes a pending (unpaid) national status from the flat charge', async () => {
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        ukNationalStatus: 'pending',
        activeTerritories: [
          makeTerritory({ territoryId: 999, isBasic: true, band: 1 }),
          makeTerritory({ territoryId: 1000, isBasic: true, band: 1 })
        ]
      })
    });
    requestBody = { territoryId: 999 };

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    // Remaining local territory only (band1, 50) -- the pending grant isn't billed yet.
    expect(res).toEqual({ success: true, newTotal: 50 });
  });

  it('does not cancel the subscription when the total is 0 but the recruiter still holds a national flag', async () => {
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        basicDiscount: 100,
        ukNationalStatus: 'active',
        activeTerritories: [makeTerritory({ territoryId: 999, isBasic: true, band: 1 })]
      })
    });
    requestBody = { territoryId: 999 };

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ success: true, newTotal: 0 });
    expect(mockSubCancel).not.toHaveBeenCalled();
    expect(mockUserRefUpdate).not.toHaveBeenCalledWith({ stripeSubscriptionId: null });
    expect(mockSubUpdate).toHaveBeenCalledWith(
      'sub_123',
      expect.objectContaining({
        items: [
          expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 0 }) })
        ]
      })
    );
  });

  it('skips the territory_category_owners claim doc lookup entirely when it does not exist', async () => {
    mockClaimGet.mockResolvedValue({ exists: false });
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        activeTerritories: [
          makeTerritory({
            territoryId: 999,
            isBasic: true,
            exclusiveMonths: ['2026-01'],
            band: 1
          })
        ]
      })
    });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ success: true, newTotal: 0 });
    expect(mockBatchDelete).not.toHaveBeenCalled();
    // Only the user-doc write happens; nothing is written for the (non-existent) claim doc.
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
  });
});
