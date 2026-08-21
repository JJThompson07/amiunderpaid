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
});
