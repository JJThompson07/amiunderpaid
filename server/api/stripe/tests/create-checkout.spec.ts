import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

type CheckoutBody = {
  currency?: string;
  territories?: {
    territoryId: number;
    categoryValue: string;
    isBasic: boolean;
    exclusiveMonths: string[];
  }[];
};
type CheckoutHandler = (event: H3Event) => Promise<{ url: string | null }>;

// 1. Stub Globals
vi.stubGlobal('defineEventHandler', (fn: CheckoutHandler) => fn);
vi.stubGlobal('useRuntimeConfig', () => ({ stripeSecretKey: 'sk_test_123' }));
vi.stubGlobal('getRequestHeader', () => 'Bearer test_token');
vi.stubGlobal('getRequestProtocol', () => 'https');
vi.stubGlobal('getRequestHost', () => 'app.example.com');
vi.stubGlobal(
  'createError',
  (err: { message?: string; statusMessage?: string; statusCode?: number }) =>
    new Error(err.message || err.statusMessage)
);

let requestBody: CheckoutBody = {};
vi.stubGlobal('readBody', async (): Promise<CheckoutBody> => requestBody);

// 2. Mock external dependencies
const { mockVerifyIdToken, mockPricingGet, mockUserGet, mockGetFirestore, mockSessionsCreate } =
  vi.hoisted(() => {
    const mockPricingGet = vi.fn();
    const mockUserGet = vi.fn();
    const mockCollection = vi.fn((path: string) => {
      if (path === 'platform_settings') {
        return { doc: (): { get: typeof mockPricingGet } => ({ get: mockPricingGet }) };
      }
      if (path === 'users') {
        return { doc: (): { get: typeof mockUserGet } => ({ get: mockUserGet }) };
      }
      return { doc: (): { get: ReturnType<typeof vi.fn> } => ({ get: vi.fn() }) };
    });
    return {
      mockVerifyIdToken: vi.fn(),
      mockPricingGet,
      mockUserGet,
      mockGetFirestore: vi.fn(() => ({ collection: mockCollection })),
      mockSessionsCreate: vi.fn()
    };
  });

vi.mock('stripe', () => ({
  default: class Stripe {
    checkout = { sessions: { create: mockSessionsCreate } };
  }
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: (): { verifyIdToken: typeof mockVerifyIdToken } => ({
    verifyIdToken: mockVerifyIdToken
  })
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: mockGetFirestore
}));

describe('create-checkout', () => {
  let handler: CheckoutHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../create-checkout.post');
    handler = mod.default;

    requestBody = {
      currency: 'gbp',
      territories: [{ territoryId: 999, categoryValue: 'IT', isBasic: true, exclusiveMonths: [] }]
    };

    mockVerifyIdToken.mockResolvedValue({ uid: 'user_123', email: 'recruiter@example.com' });
    // No pricing doc in Firestore falls through to the endpoint's hardcoded
    // DEFAULT_PRICING (UK band1 basic: 50, exclusive: 250), which every test
    // relies on unless it overrides mockPricingGet directly.
    mockPricingGet.mockResolvedValue({ exists: false });
    mockUserGet.mockResolvedValue({ data: () => ({}) });
    mockSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
  });

  it('creates a subscription-mode session with a $0 line item for a 100% basicDiscount account', async () => {
    mockUserGet.mockResolvedValue({ data: () => ({ basicDiscount: 100 }) });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ url: 'https://checkout.stripe.com/test' });
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 0,
              recurring: { interval: 'month' }
            })
          })
        ]
      })
    );
    // A $0 subscription has no meaningful trial to grant.
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ subscription_data: expect.anything() })
    );
  });

  it('throws "No items selected in cart" for a genuinely empty cart', async () => {
    requestBody = { currency: 'gbp', territories: [] };

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('No items selected in cart.');
  });

  it('throws a 500 and does not create a Stripe session when the resolved band is missing from the country pricing', async () => {
    // Pricing doc exists but only has band2 — territory 999 isn't in the
    // static territory lists, so it resolves to band1 via the default,
    // which is absent from this deliberately incomplete pricing document.
    mockPricingGet.mockResolvedValue({
      exists: true,
      data: () => ({ UK: { band2: { basic: 30, exclusive: 150 } } })
    });

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Pricing band band1 for UK not found.');
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it('throws a distinct error when exclusive months were selected but priced to zero', async () => {
    mockUserGet.mockResolvedValue({ data: () => ({ exclusiveDiscount: 100 }) });
    requestBody = {
      currency: 'gbp',
      territories: [
        { territoryId: 999, categoryValue: 'IT', isBasic: false, exclusiveMonths: ['2099-01'] }
      ]
    };

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow(
      'Exclusive month pricing resolved to zero and cannot be processed as-is.'
    );
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });
});
