import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

type WebhookHandler = (event: H3Event) => Promise<{ received: boolean }>;

// 1. Stub Globals
vi.stubGlobal('defineEventHandler', (fn: WebhookHandler) => fn);
vi.stubGlobal('useRuntimeConfig', () => ({
  stripeSecretKey: 'sk_test_123',
  // cspell:disable-next-line
  stripeWebhookSecret: 'whsec_123',
  resendApiKey: 're_test_123'
}));
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
  mockResendSend
} = vi.hoisted(() => {
  const mockCollection = vi.fn();
  const mockTransaction = {
    get: vi.fn(),
    getAll: vi.fn(),
    set: vi.fn(),
    create: vi.fn()
  };
  const mockRunTransaction = vi.fn((callback) => callback(mockTransaction));
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
    mockResendSend: vi.fn()
  };
});

vi.mock('stripe', () => {
  return {
    default: class Stripe {
      webhooks = { constructEvent: mockConstructEvent };
      refunds = { create: mockRefundsCreate };
      subscriptions = { cancel: mockSubscriptionsCancel };
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

  it('handles a subscription conflict by cancelling the subscription', async () => {
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

    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ received: true });
    expect(mockSubscriptionsCancel).toHaveBeenCalledWith('sub_123');
    expect(mockRefundsCreate).not.toHaveBeenCalled();
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
});
