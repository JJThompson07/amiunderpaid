import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

type CheckoutBody = {
  currency?: string;
  territories?: {
    territoryId: number;
    categoryValue?: string;
    isBasic: boolean;
    exclusiveMonths?: string[];
  }[];
};
type CheckoutHandler = (event: H3Event) => Promise<{ url: string | null }>;

// 1. Stub Globals
vi.stubGlobal('defineEventHandler', (fn: CheckoutHandler) => fn);
vi.stubGlobal('useRuntimeConfig', () => ({
  stripeSecretKey: 'sk_test_123',
  resendApiKey: 're_test_123'
}));
const mockGetRequestHeader = vi.fn<() => string | undefined>(() => 'Bearer test_token');
vi.stubGlobal('getRequestHeader', mockGetRequestHeader);
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
const {
  mockVerifyIdToken,
  mockPricingGet,
  mockUserGet,
  mockClaimGet,
  mockGetFirestore,
  mockSessionsCreate,
  mockTransaction,
  mockRunTransaction,
  mockSubRetrieve,
  mockSubUpdate,
  mockInvoiceItemsCreate,
  mockInvoicesCreate,
  mockInvoiceFinalize,
  mockInvoicePay,
  mockInvoicePaymentsList,
  mockRefundsCreate,
  mockResendSend
} = vi.hoisted(() => {
  const mockPricingGet = vi.fn();
  const mockUserGet = vi.fn();
  // Keyed by claim doc id (e.g. "10_IT") so tests can configure per-territory
  // conflict state; defaults to "no doc" for any id a test doesn't touch.
  const mockClaimGet = new Map<string, ReturnType<typeof vi.fn>>();
  const getClaimMock = (id: string): ReturnType<typeof vi.fn> => {
    let mock = mockClaimGet.get(id);
    if (!mock) {
      mock = vi.fn().mockResolvedValue({ exists: false, data: () => undefined });
      mockClaimGet.set(id, mock);
    }
    return mock;
  };
  const mockCollection = vi.fn((path: string) => {
    if (path === 'platform_settings') {
      return { doc: (): { get: typeof mockPricingGet } => ({ get: mockPricingGet }) };
    }
    if (path === 'users') {
      return { doc: (): { get: typeof mockUserGet } => ({ get: mockUserGet }) };
    }
    if (path === 'territory_category_owners') {
      return {
        doc: (id: string): { get: ReturnType<typeof vi.fn> } => ({ get: getClaimMock(id) })
      };
    }
    return { doc: (): { get: ReturnType<typeof vi.fn> } => ({ get: vi.fn() }) };
  });

  const mockTransaction = { get: vi.fn(), getAll: vi.fn(), set: vi.fn() };
  const mockRunTransaction = vi.fn((callback: (t: typeof mockTransaction) => unknown) =>
    callback(mockTransaction)
  );

  return {
    mockVerifyIdToken: vi.fn(),
    mockPricingGet,
    mockUserGet,
    mockClaimGet,
    mockGetFirestore: vi.fn(() => ({
      collection: mockCollection,
      runTransaction: mockRunTransaction
    })),
    mockSessionsCreate: vi.fn(),
    mockTransaction,
    mockRunTransaction,
    mockSubRetrieve: vi.fn(),
    mockSubUpdate: vi.fn(),
    mockInvoiceItemsCreate: vi.fn(),
    mockInvoicesCreate: vi.fn(),
    mockInvoiceFinalize: vi.fn(),
    mockInvoicePay: vi.fn(),
    mockInvoicePaymentsList: vi.fn(),
    mockRefundsCreate: vi.fn(),
    mockResendSend: vi.fn()
  };
});

vi.mock('stripe', () => ({
  default: class Stripe {
    checkout = { sessions: { create: mockSessionsCreate } };
    subscriptions = { retrieve: mockSubRetrieve, update: mockSubUpdate };
    invoiceItems = { create: mockInvoiceItemsCreate };
    invoices = {
      create: mockInvoicesCreate,
      finalizeInvoice: mockInvoiceFinalize,
      pay: mockInvoicePay
    };
    invoicePayments = { list: mockInvoicePaymentsList };
    refunds = { create: mockRefundsCreate };
  }
}));

vi.mock('resend', () => ({
  Resend: class Resend {
    emails = { send: mockResendSend };
  }
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: (): { verifyIdToken: typeof mockVerifyIdToken } => ({
    verifyIdToken: mockVerifyIdToken
  })
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: mockGetFirestore,
  FieldValue: { arrayUnion: (...args: unknown[]): unknown => ({ __arrayUnion: args }) }
}));

describe('create-checkout', () => {
  let handler: CheckoutHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    mockClaimGet.clear();
    mockGetRequestHeader.mockReturnValue('Bearer test_token');
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

    // Existing-subscription branch defaults; only exercised when a test sets
    // `stripeSubscriptionId` on the user doc.
    mockSubRetrieve.mockResolvedValue({
      customer: 'cus_123',
      items: { data: [{ id: 'si_123', price: { product: 'prod_123', unit_amount: 5000 } }] }
    });
    mockSubUpdate.mockResolvedValue({});
    mockInvoiceItemsCreate.mockResolvedValue({});
    mockInvoicesCreate.mockResolvedValue({ id: 'in_123' });
    mockInvoiceFinalize.mockResolvedValue({ status: 'open' });
    mockInvoicePay.mockResolvedValue({ status: 'paid' });
    mockInvoicePaymentsList.mockResolvedValue({
      data: [{ payment: { payment_intent: 'pi_123' } }]
    });
    mockRefundsCreate.mockResolvedValue({});
    mockTransaction.get.mockResolvedValue({ data: () => ({ activeTerritories: [] }) });
    mockTransaction.getAll.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('throws a 500 when the pricing document exists but is missing the country key entirely', async () => {
    mockPricingGet.mockResolvedValue({ exists: true, data: () => ({}) });

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Pricing bands for UK not found.');
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

  it('throws 401 when the authorization header is missing', async () => {
    mockGetRequestHeader.mockReturnValue(undefined);

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Unauthorized: Missing auth token');
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it('throws 401 when the authorization header is not a Bearer token', async () => {
    mockGetRequestHeader.mockReturnValue('Basic abc123');

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Unauthorized: Missing auth token');
  });

  it('throws 401 and warns when token verification fails', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid signature'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Unauthorized: Invalid token');
    expect(warnSpy).toHaveBeenCalledWith('Stripe checkout auth warning:', expect.any(Error));
    expect(mockSessionsCreate).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('defaults currency to gbp when the request body omits it', async () => {
    requestBody = {
      territories: [{ territoryId: 999, categoryValue: 'IT', isBasic: true, exclusiveMonths: [] }]
    };

    const event = {} as unknown as H3Event;
    await handler(event);

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ currency: 'gbp', unit_amount: 5000 })
          })
        ]
      })
    );
  });

  it('normalizes an uppercase currency and looks up the real USA territory band', async () => {
    // Territory 201 (Alabama) resolves to band3 via US_TERRITORY_BAND_MAP,
    // not the band1 default — DEFAULT_PRICING USA band3 basic is 25.
    requestBody = {
      currency: 'USD',
      territories: [{ territoryId: 201, categoryValue: 'IT', isBasic: true, exclusiveMonths: [] }]
    };

    const event = {} as unknown as H3Event;
    await handler(event);

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ currency: 'usd', unit_amount: 2500 })
          })
        ]
      })
    );
  });

  it('resolves the price band via real UK territory data and tolerates a missing user document body', async () => {
    // Territory 1 (Bedfordshire) resolves to band3 via TERRITORY_BAND_MAP,
    // not the band1 default — DEFAULT_PRICING UK band3 basic is 20.
    mockUserGet.mockResolvedValue({ data: () => undefined });
    requestBody = {
      currency: 'gbp',
      territories: [{ territoryId: 1, categoryValue: 'IT', isBasic: true, exclusiveMonths: [] }]
    };

    const event = {} as unknown as H3Event;
    await handler(event);

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 2000 })
          })
        ]
      })
    );
  });

  it('uses the Firestore-stored pricing document instead of DEFAULT_PRICING when it exists', async () => {
    mockPricingGet.mockResolvedValue({
      exists: true,
      data: () => ({ UK: { band1: { basic: 99, exclusive: 499 } } })
    });

    const event = {} as unknown as H3Event;
    await handler(event);

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 9900 })
          })
        ]
      })
    );
  });

  it('builds an upfront line item and uses payment mode for an exclusive-only cart', async () => {
    requestBody = {
      currency: 'gbp',
      // Not the current calendar month, so the halfway discount never applies.
      territories: [
        { territoryId: 1, categoryValue: 'IT', isBasic: false, exclusiveMonths: ['2020-01'] }
      ]
    };

    const event = {} as unknown as H3Event;
    await handler(event);

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 10000
            })
          })
        ]
      })
    );
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ subscription_data: expect.anything() })
    );
  });

  it('compresses the cart metadata with ALL/0/none fallbacks for a bare territory entry', async () => {
    requestBody = {
      currency: 'gbp',
      territories: [
        { territoryId: 999, isBasic: false },
        {
          territoryId: 1,
          categoryValue: 'IT',
          isBasic: true,
          exclusiveMonths: ['2020-01', '2020-02']
        }
      ]
    };

    const event = {} as unknown as H3Event;
    await handler(event);

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          cart: '999:ALL:0:none,1:IT:1:2020-01~2020-02'
        })
      })
    );
  });

  it('applies the 50% halfway-of-month discount to the current month only', async () => {
    // Aug 20 2026 is past the halfway point of a 31-day month.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 20));

    requestBody = {
      currency: 'gbp',
      territories: [
        { territoryId: 1, categoryValue: 'IT', isBasic: false, exclusiveMonths: ['2026-08'] }
      ]
    };

    const event = {} as unknown as H3Event;
    await handler(event);

    // Band3 exclusive (100) halved by the halfway discount.
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 5000 })
          })
        ]
      })
    );
  });

  it('grants a calendar free trial ending the 1st of next month when comfortably >48h away', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 1));

    requestBody = {
      currency: 'gbp',
      territories: [{ territoryId: 1, categoryValue: 'IT', isBasic: true, exclusiveMonths: [] }]
    };

    const event = {} as unknown as H3Event;
    await handler(event);

    const expectedTrialEnd = Math.floor(new Date(2026, 8, 1).getTime() / 1000);
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: { trial_end: expectedTrialEnd }
      })
    );
  });

  it('rolls the trial to the month after next when the 1st is under Stripe’s 48-hour minimum', async () => {
    // Aug 31 2026, 10:00 local — under 48h before Sept 1 00:00.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 31, 10, 0, 0));

    requestBody = {
      currency: 'gbp',
      territories: [{ territoryId: 1, categoryValue: 'IT', isBasic: true, exclusiveMonths: [] }]
    };

    const event = {} as unknown as H3Event;
    await handler(event);

    const expectedTrialEnd = Math.floor(new Date(2026, 9, 1).getTime() / 1000);
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: { trial_end: expectedTrialEnd }
      })
    );
  });

  it('omits customer_email when the decoded token has no email', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user_123' });

    const event = {} as unknown as H3Event;
    await handler(event);

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer_email: undefined })
    );
  });

  it('wraps a Stripe session-creation failure in a 500 using the underlying error message', async () => {
    mockSessionsCreate.mockRejectedValueOnce(new Error('card declined'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('card declined');
    expect(errorSpy).toHaveBeenCalledWith('Stripe Error:', 'card declined');
    errorSpy.mockRestore();
  });

  it('falls back to a generic message when Stripe rejects with a non-Error value', async () => {
    mockSessionsCreate.mockRejectedValueOnce('network blip');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to create checkout session.');
    errorSpy.mockRestore();
  });

  it('confirms a pending national grant with no existing subscription: builds a Checkout Session priced for the flat national charge with an empty territories cart', async () => {
    mockUserGet.mockResolvedValue({ data: () => ({ ukNationalStatus: 'pending' }) });
    requestBody = { currency: 'gbp', territories: [] };

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ url: 'https://checkout.stripe.com/test' });
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 5000,
              recurring: { interval: 'month' }
            })
          })
        ],
        metadata: expect.objectContaining({ cart: '', nationalCountry: 'UK' })
      })
    );
  });

  it('does not fold a national charge into a fresh Checkout Session when no country is pending confirmation', async () => {
    mockUserGet.mockResolvedValue({ data: () => ({}) });

    const event = {} as unknown as H3Event;
    await handler(event);

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.not.objectContaining({ nationalCountry: expect.anything() })
      })
    );
  });

  describe('existing subscription (returning recruiter)', () => {
    it('updates the existing subscription recurring total instead of creating a new Checkout Session', async () => {
      mockUserGet.mockResolvedValue({
        data: () => ({ stripeSubscriptionId: 'sub_123', activeTerritories: [] })
      });
      requestBody = {
        currency: 'gbp',
        territories: [{ territoryId: 999, categoryValue: 'IT', isBasic: true, exclusiveMonths: [] }]
      };

      const event = {} as unknown as H3Event;
      const res = await handler(event);

      expect(res).toEqual({ url: null });
      expect(mockSessionsCreate).not.toHaveBeenCalled();
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
    });

    it('charges an upfront invoice via invoiceItems.create + finalizeInvoice + pay for an exclusive-only purchase', async () => {
      mockUserGet.mockResolvedValue({
        data: () => ({ stripeSubscriptionId: 'sub_123', activeTerritories: [] })
      });
      requestBody = {
        currency: 'gbp',
        territories: [
          { territoryId: 1, categoryValue: 'IT', isBasic: false, exclusiveMonths: ['2020-01'] }
        ]
      };

      const event = {} as unknown as H3Event;
      const res = await handler(event);

      expect(res).toEqual({ url: null });
      expect(mockInvoiceItemsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_123', amount: 10000, currency: 'gbp' })
      );
      expect(mockInvoicesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
          collection_method: 'charge_automatically',
          auto_advance: false,
          // Verified against Stripe's live test-mode API: without this, the
          // invoice does not auto-attach the pending invoice item created
          // just above and settles at a $0 total.
          pending_invoice_items_behavior: 'include'
        })
      );
      expect(mockInvoiceFinalize).toHaveBeenCalledWith('in_123');
      expect(mockInvoicePay).toHaveBeenCalledWith('in_123');
    });

    it('skips the explicit pay() call when finalizeInvoice already settles the invoice as paid', async () => {
      // Verified against Stripe's live test-mode API: with a default payment
      // method on file, finalizeInvoice synchronously charges the invoice --
      // calling pay() on an already-paid invoice throws "Invoice is already
      // paid", so the code must skip it in this case.
      mockUserGet.mockResolvedValue({
        data: () => ({ stripeSubscriptionId: 'sub_123', activeTerritories: [] })
      });
      mockInvoiceFinalize.mockResolvedValueOnce({ status: 'paid' });
      requestBody = {
        currency: 'gbp',
        territories: [
          { territoryId: 1, categoryValue: 'IT', isBasic: false, exclusiveMonths: ['2020-01'] }
        ]
      };

      const event = {} as unknown as H3Event;
      const res = await handler(event);

      expect(res).toEqual({ url: null });
      expect(mockInvoicePay).not.toHaveBeenCalled();
    });

    it('throws "No items selected in cart" for an existing-subscription empty cart', async () => {
      mockUserGet.mockResolvedValue({
        data: () => ({ stripeSubscriptionId: 'sub_123', activeTerritories: [] })
      });
      requestBody = { currency: 'gbp', territories: [] };

      const event = {} as unknown as H3Event;

      await expect(handler(event)).rejects.toThrow('No items selected in cart.');
      expect(mockSubRetrieve).not.toHaveBeenCalled();
    });

    it('throws the zero-priced-exclusive error for an existing-subscription cart with a 100% exclusiveDiscount', async () => {
      mockUserGet.mockResolvedValue({
        data: () => ({
          stripeSubscriptionId: 'sub_123',
          activeTerritories: [],
          exclusiveDiscount: 100
        })
      });
      requestBody = {
        currency: 'gbp',
        territories: [
          { territoryId: 1, categoryValue: 'IT', isBasic: false, exclusiveMonths: ['2020-01'] }
        ]
      };

      const event = {} as unknown as H3Event;

      await expect(handler(event)).rejects.toThrow(
        'Exclusive month pricing resolved to zero and cannot be processed as-is.'
      );
      expect(mockSubRetrieve).not.toHaveBeenCalled();
    });

    it('folds a flat national charge into the recurring total when the recruiter holds an active national status', async () => {
      mockUserGet.mockResolvedValue({
        data: () => ({
          stripeSubscriptionId: 'sub_123',
          activeTerritories: [],
          ukNationalStatus: 'active'
        })
      });
      mockClaimGet.set(
        '999_IT',
        vi.fn().mockResolvedValue({ exists: true, data: () => ({ basicOwners: ['someone-else'] }) })
      );
      requestBody = {
        currency: 'gbp',
        territories: [{ territoryId: 999, categoryValue: 'IT', isBasic: true, exclusiveMonths: [] }]
      };

      const event = {} as unknown as H3Event;
      const res = await handler(event);

      expect(res).toEqual({ url: null });
      // Band1 basic (50) for the new territory + Band1 basic (50) flat national charge.
      expect(mockSubUpdate).toHaveBeenCalledWith(
        'sub_123',
        expect.objectContaining({
          items: [
            expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 10000 }) })
          ]
        })
      );
    });

    it('confirms a pending national grant through the existing-subscription branch: empty cart bypasses the "no items" guard, bills the flat charge, and flips the status to active', async () => {
      mockUserGet.mockResolvedValue({
        data: () => ({
          stripeSubscriptionId: 'sub_123',
          activeTerritories: [],
          ukNationalStatus: 'pending'
        })
      });
      requestBody = { currency: 'gbp', territories: [] };

      const event = {} as unknown as H3Event;
      const res = await handler(event);

      expect(res).toEqual({ url: null });
      expect(mockSubUpdate).toHaveBeenCalledWith(
        'sub_123',
        expect.objectContaining({
          items: [
            expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 5000 }) })
          ]
        })
      );
      expect(mockTransaction.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ ukNationalStatus: 'active' }),
        { merge: true }
      );
    });

    it('falls back to the "ALL" category code when a cart item omits categoryValue', async () => {
      mockUserGet.mockResolvedValue({
        data: () => ({ stripeSubscriptionId: 'sub_123', activeTerritories: [] })
      });
      requestBody = {
        currency: 'gbp',
        territories: [{ territoryId: 999, isBasic: true, exclusiveMonths: [] }]
      };

      const event = {} as unknown as H3Event;
      const res = await handler(event);

      expect(res).toEqual({ url: null });
      expect(mockSubUpdate).toHaveBeenCalled();
    });

    it('throws a 500 when the resolved band for a new territory is missing from the country pricing', async () => {
      mockUserGet.mockResolvedValue({
        data: () => ({ stripeSubscriptionId: 'sub_123', activeTerritories: [] })
      });
      mockPricingGet.mockResolvedValue({
        exists: true,
        data: () => ({ UK: { band2: { basic: 30, exclusive: 150 } } })
      });
      requestBody = {
        currency: 'gbp',
        territories: [{ territoryId: 999, categoryValue: 'IT', isBasic: true, exclusiveMonths: [] }]
      };

      const event = {} as unknown as H3Event;

      await expect(handler(event)).rejects.toThrow('Pricing band band1 for UK not found.');
      expect(mockSubUpdate).not.toHaveBeenCalled();
    });

    it('throws a 500 when the invoice does not settle synchronously after pay()', async () => {
      mockUserGet.mockResolvedValue({
        data: () => ({ stripeSubscriptionId: 'sub_123', activeTerritories: [] })
      });
      mockInvoicePay.mockResolvedValueOnce({ status: 'open' });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      requestBody = {
        currency: 'gbp',
        territories: [
          { territoryId: 1, categoryValue: 'IT', isBasic: false, exclusiveMonths: ['2020-01'] }
        ]
      };

      const event = {} as unknown as H3Event;

      await expect(handler(event)).rejects.toThrow('Failed to process payment for this purchase.');
      errorSpy.mockRestore();
    });

    it('rejects with 409 pre-charge when the cart conflicts with an existing exclusive-month lock', async () => {
      mockUserGet.mockResolvedValue({
        data: () => ({ stripeSubscriptionId: 'sub_123', activeTerritories: [] })
      });
      mockClaimGet.set(
        '1_IT',
        vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ takenExclusiveMonths: { '2020-01': 'other-user' } })
        })
      );
      requestBody = {
        currency: 'gbp',
        territories: [
          { territoryId: 1, categoryValue: 'IT', isBasic: false, exclusiveMonths: ['2020-01'] }
        ]
      };

      const event = {} as unknown as H3Event;

      await expect(handler(event)).rejects.toThrow(
        'One or more selected exclusive months are no longer available. Please refresh and try again.'
      );
      expect(mockSubUpdate).not.toHaveBeenCalled();
      expect(mockInvoiceItemsCreate).not.toHaveBeenCalled();
    });

    it('throws a 500 and never runs the Firestore fulfilment transaction when the Stripe subscription update fails', async () => {
      mockUserGet.mockResolvedValue({
        data: () => ({ stripeSubscriptionId: 'sub_123', activeTerritories: [] })
      });
      mockSubUpdate.mockRejectedValueOnce(new Error('stripe down'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const event = {} as unknown as H3Event;

      await expect(handler(event)).rejects.toThrow('Failed to process payment for this purchase.');
      expect(mockRunTransaction).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('refunds and reverts the subscription on a late-discovered conflict inside the fulfilment transaction', async () => {
      mockUserGet.mockResolvedValue({
        data: () => ({ stripeSubscriptionId: 'sub_123', activeTerritories: [] })
      });
      requestBody = {
        currency: 'gbp',
        territories: [
          { territoryId: 1, categoryValue: 'IT', isBasic: false, exclusiveMonths: ['2020-01'] }
        ]
      };
      // A concurrent purchase claims the same exclusive month between the
      // pre-check (no conflict, so the charge above succeeds) and the
      // fulfilment transaction's fresh read.
      mockTransaction.getAll.mockResolvedValueOnce([
        {
          id: '1_IT',
          exists: true,
          data: (): { takenExclusiveMonths: Record<string, string> } => ({
            takenExclusiveMonths: { '2020-01': 'other-user' }
          })
        }
      ]);

      const event = {} as unknown as H3Event;

      await expect(handler(event)).rejects.toThrow(
        'One or more selected exclusive months became unavailable during checkout. Any charge has been refunded and will not be billed further.'
      );

      expect(mockRefundsCreate).toHaveBeenCalledWith({ payment_intent: 'pi_123' });
      // Called twice: the original purchase's recurring update, then the revert.
      expect(mockSubUpdate).toHaveBeenCalledTimes(2);
      expect(mockSubUpdate).toHaveBeenLastCalledWith(
        'sub_123',
        expect.objectContaining({
          items: [
            expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 5000 }) })
          ]
        })
      );
      expect(mockResendSend).not.toHaveBeenCalled();
    });

    it('alerts ops when the refund reversal cannot resolve a payment intent to refund', async () => {
      mockUserGet.mockResolvedValue({
        data: () => ({ stripeSubscriptionId: 'sub_123', activeTerritories: [] })
      });
      // No items on the subscription -- exercises the revertItem-undefined
      // fallback (unit_amount defaults to 0) alongside the unresolvable
      // invoice-payment branch below.
      mockSubRetrieve.mockResolvedValue({ customer: 'cus_123', items: { data: [] } });
      mockInvoicePaymentsList.mockResolvedValueOnce({ data: [] });
      requestBody = {
        currency: 'gbp',
        territories: [
          { territoryId: 1, categoryValue: 'IT', isBasic: false, exclusiveMonths: ['2020-01'] }
        ]
      };
      mockTransaction.get.mockResolvedValueOnce({ data: () => undefined });
      mockTransaction.getAll.mockResolvedValueOnce([
        {
          id: '1_IT',
          exists: true,
          data: (): { takenExclusiveMonths: Record<string, string> } => ({
            takenExclusiveMonths: { '2020-01': 'other-user' }
          })
        }
      ]);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const event = {} as unknown as H3Event;

      await expect(handler(event)).rejects.toThrow(
        'One or more selected exclusive months became unavailable during checkout. Any charge has been refunded and will not be billed further.'
      );
      expect(mockRefundsCreate).not.toHaveBeenCalled();
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Stripe territory conflict refund failed')
        })
      );
      errorSpy.mockRestore();
    });
  });
});
