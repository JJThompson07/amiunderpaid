import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

type WebhookHandler = (event: H3Event) => Promise<{ received: boolean }>;

// 1. Stub Globals
vi.stubGlobal('defineEventHandler', (fn: WebhookHandler) => fn);
vi.stubGlobal('useRuntimeConfig', () => ({
  stripeSecretKey: 'sk_test_123',
  // cspell:disable-next-line
  stripeWebhookSecret: 'whsec_123'
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
  mockSeenSet,
  mockCollection,
  mockDoc,
  mockGetFirestore
} = vi.hoisted(() => {
  const mockCollection = vi.fn();
  const mockTransaction = {
    get: vi.fn(),
    getAll: vi.fn(),
    set: vi.fn()
  };
  const mockRunTransaction = vi.fn((callback) => callback(mockTransaction));
  return {
    mockConstructEvent: vi.fn(),
    mockTransaction,
    mockRunTransaction,
    mockSeenGet: vi.fn(),
    mockSeenSet: vi.fn(),
    mockCollection,
    mockDoc: vi.fn(),
    mockGetFirestore: vi.fn(() => ({
      collection: mockCollection,
      runTransaction: mockRunTransaction
    }))
  };
});

vi.mock('stripe', () => {
  return {
    default: class Stripe {
      webhooks = { constructEvent: mockConstructEvent };
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
          doc: (): { get: typeof mockSeenGet; set: typeof mockSeenSet } => ({
            get: mockSeenGet,
            set: mockSeenSet
          })
        };
      }
      return { doc: mockDoc };
    });

    // Default to event not seen
    mockSeenGet.mockResolvedValue({ exists: false });

    // Default transaction mocks
    mockTransaction.get.mockResolvedValue({ data: () => ({ activeTerritories: [] }) });
    mockTransaction.getAll.mockResolvedValue([]);
  });

  it('throws error on invalid signature', async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error('Invalid sig');
    });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Invalid signature');
  });

  it('skips processing if event was already seen', async () => {
    mockSeenGet.mockResolvedValueOnce({ exists: true });
    const event = {} as unknown as H3Event;

    const res = await handler(event);
    expect(res).toEqual({ received: true });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('processes checkout session and updates user territories', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ received: true });

    // It should have run the transaction
    expect(mockRunTransaction).toHaveBeenCalled();

    // It should set the seen marker
    expect(mockSeenSet).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'checkout.session.completed',
        processedAt: 'TIMESTAMP'
      })
    );
  });

  it('handles business conflict properly by queuing refund and returning 200', async () => {
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

    // Event should be marked as conflict
    expect(mockSeenSet).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'conflict'
      })
    );
  });

  it('throws a 500 error on generic transaction failure', async () => {
    mockRunTransaction.mockRejectedValueOnce(new Error('Firebase is down'));

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Database fulfillment failed');
  });
});
