import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import type { TerritoryClaim } from '~~/shared/utils/types';

type SetNationalBody = { uid?: string; country?: string; active?: boolean };
type SetNationalHandler = (
  event: H3Event
) => Promise<{ success: boolean; newTotal: number; status: 'pending' | 'active' | null }>;

vi.stubGlobal('defineEventHandler', (fn: SetNationalHandler) => fn);
vi.stubGlobal('useRuntimeConfig', () => ({ stripeSecretKey: 'sk_test_123' }));
vi.stubGlobal(
  'createError',
  (err: { message?: string; statusMessage?: string; statusCode?: number }) =>
    new Error(err.message || err.statusMessage)
);

let requestBody: SetNationalBody = {};
vi.stubGlobal('readBody', async (): Promise<SetNationalBody> => requestBody);

const {
  mockPricingGet,
  mockUserGet,
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
    band2: { basic: 30, exclusive: 150 }
  },
  USA: {
    band1: { basic: 60, exclusive: 300 }
  }
};

const makeTerritory = (overrides: Partial<TerritoryClaim> = {}): TerritoryClaim => ({
  territoryId: 5,
  categoryValue: 'IT',
  isBasic: true,
  exclusiveMonths: [],
  band: 1,
  ...overrides
});

describe('set-national', () => {
  let handler: SetNationalHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../set-national.post');
    handler = mod.default;

    requestBody = { uid: 'recruiter_1', country: 'UK', active: true };

    mockPricingGet.mockResolvedValue({ exists: true, data: () => wellFormedPricing });
    mockClaimGet.mockResolvedValue({ exists: false });
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        activeTerritories: []
      })
    });
    mockSubRetrieve.mockResolvedValue({
      items: { data: [{ id: 'si_123', price: { product: 'prod_123' } }] }
    });
    mockSubUpdate.mockResolvedValue({});
  });

  it('rejects a missing uid', async () => {
    requestBody = { country: 'UK', active: true };
    const event = {} as unknown as H3Event;
    await expect(handler(event)).rejects.toThrow('Missing or invalid uid, country, or active.');
  });

  it('rejects an invalid country', async () => {
    requestBody = { uid: 'recruiter_1', country: 'FR', active: true };
    const event = {} as unknown as H3Event;
    await expect(handler(event)).rejects.toThrow('Missing or invalid uid, country, or active.');
  });

  it('rejects a non-boolean active value', async () => {
    requestBody = { uid: 'recruiter_1', country: 'UK', active: 'yes' as unknown as boolean };
    const event = {} as unknown as H3Event;
    await expect(handler(event)).rejects.toThrow('Missing or invalid uid, country, or active.');
  });

  it('rejects with a 404 when the recruiter has no Firestore document', async () => {
    mockUserGet.mockResolvedValue({ data: () => undefined });
    const event = {} as unknown as H3Event;
    await expect(handler(event)).rejects.toThrow('User not found');
  });

  it('grants UK national coverage as pending when the recruiter has no existing subscription, without touching Stripe or wiping territories', async () => {
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        activeTerritories: [makeTerritory({ territoryId: 5, categoryValue: 'IT', band: 1 })]
      })
    });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ success: true, newTotal: 50, status: 'pending' });
    expect(mockSubUpdate).not.toHaveBeenCalled();
    expect(mockSubCancel).not.toHaveBeenCalled();
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ukNationalStatus: 'pending',
        activeTerritories: [makeTerritory({ territoryId: 5, categoryValue: 'IT', band: 1 })]
      })
    );
  });

  it('grants UK national coverage: wipes UK local claims, keeps other-country claims, and bills a flat Band 1 charge', async () => {
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        activeTerritories: [
          makeTerritory({ territoryId: 5, categoryValue: 'IT', band: 1 }),
          makeTerritory({ territoryId: 210, categoryValue: 'IT', band: 1 }) // USA, kept
        ]
      })
    });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    // Kept USA territory (band1, priced via the UK billingCountry table per the
    // existing single-currency simplification: 50) + flat national charge (50) = 100.
    expect(res).toEqual({ success: true, newTotal: 100, status: 'active' });
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ukNationalStatus: 'active',
        activeTerritories: [makeTerritory({ territoryId: 210, categoryValue: 'IT', band: 1 })]
      })
    );
    expect(mockSubUpdate).toHaveBeenCalledWith(
      'sub_123',
      expect.objectContaining({
        items: [
          expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 10000 }) })
        ]
      })
    );
  });

  it('surgically removes the recruiter from a shared claim doc without deleting other owners', async () => {
    mockClaimGet.mockResolvedValue({
      exists: true,
      data: () => ({
        takenExclusiveMonths: { '2026-01': 'recruiter_1', '2026-02': 'other_user' },
        basicOwners: ['recruiter_1', 'other_user']
      })
    });
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        activeTerritories: [
          makeTerritory({ territoryId: 5, categoryValue: 'IT', exclusiveMonths: ['2026-01'] })
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
        basicOwners: 'ARRAY_REMOVE(recruiter_1)'
      })
    );
  });

  it('deletes the claim doc once the recruiter was its only owner', async () => {
    mockClaimGet.mockResolvedValue({
      exists: true,
      data: () => ({ basicOwners: ['recruiter_1'] })
    });
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        activeTerritories: [makeTerritory({ territoryId: 5, categoryValue: 'IT' })]
      })
    });

    const event = {} as unknown as H3Event;
    await handler(event);

    expect(mockBatchDelete).toHaveBeenCalled();
  });

  it('revokes national coverage, clears the status field, and does not restore local territories', async () => {
    requestBody = { uid: 'recruiter_1', country: 'UK', active: false };
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        ukNationalStatus: 'active',
        activeTerritories: []
      })
    });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ success: true, newTotal: 0, status: null });
    expect(mockSubCancel).toHaveBeenCalledWith('sub_123');
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ukNationalStatus: 'FIELD_DELETE', activeTerritories: [] })
    );
  });

  it('revokes a pending national grant with no Stripe subscription, clearing the status field without any Stripe call', async () => {
    requestBody = { uid: 'recruiter_1', country: 'UK', active: false };
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        ukNationalStatus: 'pending',
        activeTerritories: []
      })
    });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ success: true, newTotal: 0, status: null });
    expect(mockSubCancel).not.toHaveBeenCalled();
    expect(mockSubUpdate).not.toHaveBeenCalled();
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ukNationalStatus: 'FIELD_DELETE', activeTerritories: [] })
    );
  });

  it('does not cancel the subscription on revoke when the recruiter still holds the other national flag', async () => {
    requestBody = { uid: 'recruiter_1', country: 'UK', active: false };
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'UK',
        stripeSubscriptionId: 'sub_123',
        ukNationalStatus: 'active',
        usaNationalStatus: 'active',
        activeTerritories: []
      })
    });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.newTotal).toBe(50);
    expect(mockSubCancel).not.toHaveBeenCalled();
    expect(mockSubUpdate).toHaveBeenCalledWith(
      'sub_123',
      expect.objectContaining({
        items: [
          expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 5000 }) })
        ]
      })
    );
  });

  it('grants USA national coverage using the USA territory boundary and Band 1 price', async () => {
    requestBody = { uid: 'recruiter_1', country: 'USA', active: true };
    mockUserGet.mockResolvedValue({
      data: () => ({
        billingCountry: 'USA',
        stripeSubscriptionId: 'sub_123',
        activeTerritories: [makeTerritory({ territoryId: 210, categoryValue: 'IT', band: 1 })]
      })
    });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ success: true, newTotal: 60, status: 'active' });
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ usaNationalStatus: 'active', activeTerritories: [] })
    );
  });

  it('throws a 500 and does not commit Firestore when the Stripe update fails', async () => {
    mockSubUpdate.mockRejectedValueOnce(new Error('stripe down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to update billing with Stripe.');
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('throws a 500 when the pricing document is missing the billing country', async () => {
    mockPricingGet.mockResolvedValue({
      exists: true,
      data: () => ({ USA: wellFormedPricing.USA })
    });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Pricing bands for UK not found.');
    expect(mockSubUpdate).not.toHaveBeenCalled();
  });
});
