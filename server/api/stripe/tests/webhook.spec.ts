import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

type WebhookHandler = (event: H3Event) => Promise<{ received: boolean }>;

// 1. Stub Globals
vi.stubGlobal('defineEventHandler', (fn: WebhookHandler) => fn);
const mockUseRuntimeConfig = vi.fn<
  () => { stripeSecretKey: string; stripeWebhookSecret: string; resendApiKey: string | undefined }
>(() => ({
  stripeSecretKey: 'sk_test_123',
  // cspell:disable-next-line
  stripeWebhookSecret: 'whsec_123',
  resendApiKey: 're_test_123'
}));
vi.stubGlobal('useRuntimeConfig', mockUseRuntimeConfig);
vi.stubGlobal('readRawBody', async () => 'raw_body_string');
vi.stubGlobal('getHeader', () => 'signature_123');
vi.stubGlobal(
  'createError',
  (err: { message: string; statusCode?: number }) => new Error(err.message)
);

// 2. Mock external dependencies
const {
  mockConstructEvent,
  mockTransaction,
  mockRunTransaction,
  mockSeenGet,
  mockCollection,
  mockDoc,
  mockGetFirestore,
  mockRefundsCreate,
  mockSubscriptionsCancel,
  mockSubscriptionsRetrieve,
  mockInvoicePaymentsList,
  mockResendSend
} = vi.hoisted(() => {
  const mockCollection = vi.fn();
  const mockTransaction = {
    get: vi.fn(),
    getAll: vi.fn(),
    set: vi.fn(),
    create: vi.fn()
  };

  // Mirrors the real @google-cloud/firestore Transaction: get/getAll throw
  // once any write has been staged, since Firestore requires all reads
  // before all writes. This wraps mockTransaction (which tests configure
  // directly via mockResolvedValue/toHaveBeenCalledWith) rather than
  // replacing it, so an accidental write staged ahead of a read fails the
  // same way it would in production instead of passing silently.
  const READ_AFTER_WRITE_ERROR_MSG =
    'Firestore transactions require all reads to be executed before all writes.';
  const mockRunTransaction = vi.fn((callback) => {
    let hasStagedWrite = false;
    const t = {
      get: (
        ...args: Parameters<typeof mockTransaction.get>
      ): ReturnType<typeof mockTransaction.get> => {
        if (hasStagedWrite) {
          throw new Error(READ_AFTER_WRITE_ERROR_MSG);
        }
        return mockTransaction.get(...args);
      },
      getAll: (
        ...args: Parameters<typeof mockTransaction.getAll>
      ): ReturnType<typeof mockTransaction.getAll> => {
        if (hasStagedWrite) {
          throw new Error(READ_AFTER_WRITE_ERROR_MSG);
        }
        return mockTransaction.getAll(...args);
      },
      set: (
        ...args: Parameters<typeof mockTransaction.set>
      ): ReturnType<typeof mockTransaction.set> => {
        hasStagedWrite = true;
        return mockTransaction.set(...args);
      },
      create: (
        ...args: Parameters<typeof mockTransaction.create>
      ): ReturnType<typeof mockTransaction.create> => {
        hasStagedWrite = true;
        return mockTransaction.create(...args);
      }
    };
    return callback(t);
  });
  return {
    mockConstructEvent: vi.fn(),
    mockTransaction,
    mockRunTransaction,
    mockSeenGet: vi.fn(),
    mockCollection,
    mockDoc: vi.fn(),
    mockGetFirestore: vi.fn(() => ({
      collection: mockCollection,
      runTransaction: mockRunTransaction
    })),
    mockRefundsCreate: vi.fn(),
    mockSubscriptionsCancel: vi.fn(),
    mockSubscriptionsRetrieve: vi.fn(),
    mockInvoicePaymentsList: vi.fn(),
    mockResendSend: vi.fn()
  };
});

vi.mock('stripe', () => {
  return {
    default: class Stripe {
      webhooks = { constructEvent: mockConstructEvent };
      refunds = { create: mockRefundsCreate };
      subscriptions = { cancel: mockSubscriptionsCancel, retrieve: mockSubscriptionsRetrieve };
      invoicePayments = { list: mockInvoicePaymentsList };
    }
  };
});

vi.mock('resend', () => {
  return {
    Resend: class Resend {
      emails = { send: mockResendSend };
    }
  };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: mockGetFirestore,
  FieldValue: {
    serverTimestamp: vi.fn(() => 'TIMESTAMP'),
    arrayUnion: vi.fn((val) => `ARRAY_UNION(${val})`)
  }
}));

function alreadyExistsError(): Error {
  const err = new Error('6 ALREADY_EXISTS: document already exists') as Error & {
    code: number;
  };
  err.code = 6;
  return err;
}

describe('Stripe Webhook', () => {
  let handler: WebhookHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    mockUseRuntimeConfig.mockReturnValue({
      stripeSecretKey: 'sk_test_123',
      // cspell:disable-next-line
      stripeWebhookSecret: 'whsec_123',
      resendApiKey: 're_test_123'
    });
    const mod = await import('../webhook.post');
    handler = mod.default;

    // Default mocks
    mockConstructEvent.mockReturnValue({
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          mode: 'payment',
          payment_intent: 'pi_123',
          metadata: {
            userId: 'user_123',
            cart: '1:dev:1:2024-01~2024-02'
          }
        }
      }
    });

    mockCollection.mockImplementation((path) => {
      if (path === 'stripe_events') {
        return {
          doc: (): { get: typeof mockSeenGet } => ({ get: mockSeenGet })
        };
      }
      return { doc: mockDoc };
    });

    // Default to event not seen
    mockSeenGet.mockResolvedValue({ exists: false });

    // Default transaction mocks
    mockTransaction.get.mockResolvedValue({ data: () => ({ activeTerritories: [] }) });
    mockTransaction.getAll.mockResolvedValue([]);

    // Default to a successful refund
    mockRefundsCreate.mockResolvedValue({ id: 're_123' });
    mockSubscriptionsCancel.mockResolvedValue({ id: 'sub_123' });
    mockSubscriptionsRetrieve.mockResolvedValue({ latest_invoice: null });
    mockInvoicePaymentsList.mockResolvedValue({ data: [] });
  });

  it('throws error on invalid signature', async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error('Invalid sig');
    });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Invalid signature');
  });

  it('skips processing if event was already fully processed', async () => {
    mockSeenGet.mockResolvedValueOnce({ exists: true });
    const event = {} as unknown as H3Event;

    const res = await handler(event);
    expect(res).toEqual({ received: true });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('returns 200 without erroring when a concurrent delivery wins the dedup race', async () => {
    // Simulates a second concurrent delivery whose transaction commit fails
    // because the first delivery's t.create() already claimed the marker.
    mockRunTransaction.mockRejectedValueOnce(alreadyExistsError());
    const event = {} as unknown as H3Event;

    const res = await handler(event);
    expect(res).toEqual({ received: true });
  });

  it('processes checkout session and updates user territories', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ received: true });

    // It should have run the transaction
    expect(mockRunTransaction).toHaveBeenCalled();

    // It should create the dedup marker as part of the transaction
    expect(mockTransaction.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'checkout.session.completed',
        status: 'processing',
        processedAt: 'TIMESTAMP'
      })
    );

    // It should finalize the seen marker on success
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'checkout.session.completed',
        processedAt: 'TIMESTAMP'
      }),
      { merge: true }
    );

    // No refund/alert should fire on a clean success
    expect(mockRefundsCreate).not.toHaveBeenCalled();
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('handles a one-off payment conflict by refunding and recording the outcome', async () => {
    // Setup a conflict: month already taken by someone else
    mockTransaction.getAll.mockResolvedValueOnce([
      {
        id: '1_dev',
        exists: true,
        data: (): { takenExclusiveMonths: Record<string, string> } => ({
          takenExclusiveMonths: { '2024-01': 'other_user' }
        })
      }
    ]);

    const event = {} as unknown as H3Event;

    const res = await handler(event);

    // Stripe retries shouldn't be triggered
    expect(res).toEqual({ received: true });

    // The one-off payment should be refunded
    expect(mockRefundsCreate).toHaveBeenCalledWith({ payment_intent: 'pi_123' });
    expect(mockSubscriptionsCancel).not.toHaveBeenCalled();

    // Event should be marked as conflict
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ outcome: 'conflict' }),
      { merge: true }
    );

    // Refund succeeded, so no alert email is needed
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('handles a subscription conflict by refunding the paid invoice and cancelling the subscription', async () => {
    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_sub_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_sub_123',
          mode: 'subscription',
          subscription: 'sub_123',
          metadata: {
            userId: 'user_123',
            cart: '1:dev:1:2024-01~2024-02'
          }
        }
      }
    });
    mockTransaction.getAll.mockResolvedValueOnce([
      {
        id: '1_dev',
        exists: true,
        data: (): { takenExclusiveMonths: Record<string, string> } => ({
          takenExclusiveMonths: { '2024-01': 'other_user' }
        })
      }
    ]);
    mockSubscriptionsRetrieve.mockResolvedValueOnce({
      latest_invoice: { id: 'in_123', amount_paid: 10000 }
    });
    mockInvoicePaymentsList.mockResolvedValueOnce({
      data: [{ payment: { payment_intent: 'pi_sub_123' } }]
    });

    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ received: true });
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_123', {
      expand: ['latest_invoice']
    });
    expect(mockInvoicePaymentsList).toHaveBeenCalledWith({ invoice: 'in_123' });
    expect(mockRefundsCreate).toHaveBeenCalledWith({ payment_intent: 'pi_sub_123' });
    expect(mockSubscriptionsCancel).toHaveBeenCalledWith('sub_123');
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('cancels without refunding on a trialling subscription with nothing collected', async () => {
    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_sub_trial_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_sub_trial_123',
          mode: 'subscription',
          subscription: 'sub_trial_123',
          metadata: {
            userId: 'user_123',
            cart: '1:dev:1:2024-01~2024-02'
          }
        }
      }
    });
    mockTransaction.getAll.mockResolvedValueOnce([
      {
        id: '1_dev',
        exists: true,
        data: (): { takenExclusiveMonths: Record<string, string> } => ({
          takenExclusiveMonths: { '2024-01': 'other_user' }
        })
      }
    ]);
    mockSubscriptionsRetrieve.mockResolvedValueOnce({
      latest_invoice: { id: 'in_trial_123', amount_paid: 0 }
    });

    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ received: true });
    expect(mockInvoicePaymentsList).not.toHaveBeenCalled();
    expect(mockRefundsCreate).not.toHaveBeenCalled();
    expect(mockSubscriptionsCancel).toHaveBeenCalledWith('sub_trial_123');
    // Cancelling a trial that never charged anything is the correct outcome,
    // not a degraded one — no alert should fire.
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('sends an alert email when the automated refund itself fails', async () => {
    mockTransaction.getAll.mockResolvedValueOnce([
      {
        id: '1_dev',
        exists: true,
        data: (): { takenExclusiveMonths: Record<string, string> } => ({
          takenExclusiveMonths: { '2024-01': 'other_user' }
        })
      }
    ]);
    mockRefundsCreate.mockRejectedValueOnce(new Error('charge already refunded'));

    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ received: true });
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'support@amiunderpaid.com',
        subject: expect.stringContaining('cs_123')
      })
    );
  });

  it('throws a 500 error on generic transaction failure', async () => {
    mockRunTransaction.mockRejectedValueOnce(new Error('Firebase is down'));

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Database fulfillment failed');
  });

  it('does not refund a purchase that succeeded on a retried transaction attempt', async () => {
    // Simulates Firestore internally re-invoking the transaction callback: the
    // first attempt hits a conflict, the second (retried) attempt succeeds
    // cleanly. Only the final attempt's outcome should drive refund behaviour.
    mockTransaction.getAll
      .mockResolvedValueOnce([
        {
          id: '1_dev',
          exists: true,
          data: (): { takenExclusiveMonths: Record<string, string> } => ({
            takenExclusiveMonths: { '2024-01': 'other_user' }
          })
        }
      ])
      .mockResolvedValueOnce([]);

    mockRunTransaction.mockImplementationOnce(async (callback) => {
      const makeAttempt = (): {
        get: (
          ...args: Parameters<typeof mockTransaction.get>
        ) => ReturnType<typeof mockTransaction.get>;
        getAll: (
          ...args: Parameters<typeof mockTransaction.getAll>
        ) => ReturnType<typeof mockTransaction.getAll>;
        set: (
          ...args: Parameters<typeof mockTransaction.set>
        ) => ReturnType<typeof mockTransaction.set>;
        create: (
          ...args: Parameters<typeof mockTransaction.create>
        ) => ReturnType<typeof mockTransaction.create>;
      } => {
        let hasStagedWrite = false;
        return {
          get: (
            ...args: Parameters<typeof mockTransaction.get>
          ): ReturnType<typeof mockTransaction.get> => {
            if (hasStagedWrite) {
              throw new Error('read after write');
            }
            return mockTransaction.get(...args);
          },
          getAll: (
            ...args: Parameters<typeof mockTransaction.getAll>
          ): ReturnType<typeof mockTransaction.getAll> => {
            if (hasStagedWrite) {
              throw new Error('read after write');
            }
            return mockTransaction.getAll(...args);
          },
          set: (
            ...args: Parameters<typeof mockTransaction.set>
          ): ReturnType<typeof mockTransaction.set> => {
            hasStagedWrite = true;
            return mockTransaction.set(...args);
          },
          create: (
            ...args: Parameters<typeof mockTransaction.create>
          ): ReturnType<typeof mockTransaction.create> => {
            hasStagedWrite = true;
            return mockTransaction.create(...args);
          }
        };
      };

      await callback(makeAttempt());
      return callback(makeAttempt());
    });

    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ received: true });
    expect(mockRefundsCreate).not.toHaveBeenCalled();
    expect(mockSubscriptionsCancel).not.toHaveBeenCalled();
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('returns received:true without running a transaction for event types it does not handle', async () => {
    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_other',
      type: 'payment_intent.succeeded',
      data: { object: {} }
    });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ received: true });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('returns a 500 when the session is missing required metadata', async () => {
    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_no_meta',
      type: 'checkout.session.completed',
      data: {
        object: { id: 'cs_no_meta', mode: 'payment', payment_intent: 'pi_no_meta', metadata: {} }
      }
    });

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Database fulfillment failed');
  });

  it('skips claim writes for a cart item with no basic flag and no exclusive months, defaulting an empty category code', async () => {
    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_sparse',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_sparse',
          mode: 'payment',
          payment_intent: 'pi_sparse',
          metadata: { userId: 'user_123', cart: '1:dev:1:2024-01,2::0:none' }
        }
      }
    });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ received: true });
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });

  it('merges an upgrade into an existing user territory instead of pushing a duplicate', async () => {
    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_upgrade',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_upgrade',
          mode: 'payment',
          payment_intent: 'pi_upgrade',
          metadata: { userId: 'user_123', cart: '1:dev:1:2024-01' }
        }
      }
    });
    mockTransaction.get.mockResolvedValueOnce({
      data: () => ({
        activeTerritories: [
          { territoryId: 1, categoryValue: 'dev', isBasic: false, exclusiveMonths: ['2024-03'] }
        ]
      })
    });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ received: true });
    expect(mockTransaction.set).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        activeTerritories: [
          {
            territoryId: 1,
            categoryValue: 'dev',
            isBasic: true,
            exclusiveMonths: ['2024-03', '2024-01']
          }
        ]
      }),
      { merge: true }
    );
  });

  it('alerts instead of refunding when a conflicting payment-mode session has no payment_intent to refund', async () => {
    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_no_pi',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_no_pi',
          mode: 'payment',
          metadata: { userId: 'user_123', cart: '1:dev:1:2024-01' }
        }
      }
    });
    mockTransaction.getAll.mockResolvedValueOnce([
      {
        id: '1_dev',
        exists: true,
        data: (): { takenExclusiveMonths: Record<string, string> } => ({
          takenExclusiveMonths: { '2024-01': 'other_user' }
        })
      }
    ]);

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ received: true });
    expect(mockRefundsCreate).not.toHaveBeenCalled();
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('no payment_intent to refund') })
    );
  });

  it('alerts when a conflicting session is in neither payment nor subscription mode', async () => {
    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_setup',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_setup',
          mode: 'setup',
          metadata: { userId: 'user_123', cart: '1:dev:1:2024-01' }
        }
      }
    });
    mockTransaction.getAll.mockResolvedValueOnce([
      {
        id: '1_dev',
        exists: true,
        data: (): { takenExclusiveMonths: Record<string, string> } => ({
          takenExclusiveMonths: { '2024-01': 'other_user' }
        })
      }
    ]);

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ received: true });
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('no payment_intent or subscription to refund/cancel')
      })
    );
  });

  it('alerts when a paid invoice has no resolvable invoice payment to refund', async () => {
    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_unresolvable',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_unresolvable',
          mode: 'subscription',
          subscription: 'sub_unresolvable',
          metadata: { userId: 'user_123', cart: '1:dev:1:2024-01' }
        }
      }
    });
    mockTransaction.getAll.mockResolvedValueOnce([
      {
        id: '1_dev',
        exists: true,
        data: (): { takenExclusiveMonths: Record<string, string> } => ({
          takenExclusiveMonths: { '2024-01': 'other_user' }
        })
      }
    ]);
    mockSubscriptionsRetrieve.mockResolvedValueOnce({
      latest_invoice: { id: 'in_unresolvable', amount_paid: 5000 }
    });
    mockInvoicePaymentsList.mockResolvedValueOnce({ data: [] });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ received: true });
    expect(mockSubscriptionsCancel).not.toHaveBeenCalled();
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('no resolvable invoice payment')
      })
    );
  });

  it('does not send an alert email when RESEND_API_KEY is not configured, only logs', async () => {
    mockUseRuntimeConfig.mockReturnValue({
      stripeSecretKey: 'sk_test_123',
      // cspell:disable-next-line
      stripeWebhookSecret: 'whsec_123',
      resendApiKey: undefined
    });
    mockTransaction.getAll.mockResolvedValueOnce([
      {
        id: '1_dev',
        exists: true,
        data: (): { takenExclusiveMonths: Record<string, string> } => ({
          takenExclusiveMonths: { '2024-01': 'other_user' }
        })
      }
    ]);
    mockRefundsCreate.mockRejectedValueOnce(new Error('refund also failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ received: true });
    expect(mockResendSend).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('No RESEND_API_KEY configured')
    );
    consoleSpy.mockRestore();
  });

  it('stringifies a non-Error refund rejection in the alert email body', async () => {
    mockTransaction.getAll.mockResolvedValueOnce([
      {
        id: '1_dev',
        exists: true,
        data: (): { takenExclusiveMonths: Record<string, string> } => ({
          takenExclusiveMonths: { '2024-01': 'other_user' }
        })
      }
    ]);
    mockRefundsCreate.mockRejectedValueOnce('rate limited by Stripe');

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ received: true });
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('rate limited by Stripe') })
    );
  });

  it('treats a non-Error thrown value as not an already-exists error and returns a 500', async () => {
    mockRunTransaction.mockRejectedValueOnce('boom');

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Database fulfillment failed');
  });

  it('records stripeSubscriptionId on the user profile after a clean subscription checkout', async () => {
    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_clean_sub',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_clean_sub',
          mode: 'subscription',
          subscription: 'sub_clean_123',
          metadata: { userId: 'user_123', cart: '1:dev:1:2024-01' }
        }
      }
    });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res).toEqual({ received: true });
    expect(mockTransaction.set).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ stripeSubscriptionId: 'sub_clean_123' }),
      { merge: true }
    );
  });
});
