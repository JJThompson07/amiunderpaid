import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type DiscountHandler = (event: H3Event) => Promise<{ success: boolean }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.statusMessage || err.message) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});
vi.stubGlobal('getRequestHeader', () => mockAuthHeader);

let mockAuthHeader: string | undefined;
const mockVerifyIdToken = vi.fn();
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({ verifyIdToken: mockVerifyIdToken }))
}));

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

const mockUpdate = vi.fn();
const mockCollection = vi.fn(() => ({ doc: vi.fn(() => ({ update: mockUpdate })) }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection }))
}));

describe('admin recruiters/discount endpoint', () => {
  let handler: DiscountHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../discount.post');
    handler = mod.default as unknown as DiscountHandler;

    mockAuthHeader = 'Bearer valid-token';
    mockVerifyIdToken.mockResolvedValue({ uid: 'admin_1' });
    mockReadBody.mockResolvedValue({ uid: 'rec_1', basicDiscount: 10, exclusiveDiscount: 20 });
    mockUpdate.mockResolvedValue(undefined);
  });

  it('rejects without a Bearer token', async () => {
    mockAuthHeader = undefined;
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow();
  });

  it('requires a uid', async () => {
    mockReadBody.mockResolvedValue({});
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Missing UID');
  });

  it('rejects a basic discount outside 0-100', async () => {
    mockReadBody.mockResolvedValue({ uid: 'rec_1', basicDiscount: 150, exclusiveDiscount: 0 });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Basic discount must be between 0 and 100.');
  });

  it('rejects an exclusive discount outside 0-100', async () => {
    mockReadBody.mockResolvedValue({ uid: 'rec_1', basicDiscount: 0, exclusiveDiscount: -5 });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Exclusive discount must be between 0 and 100.');
  });

  it('normalizes non-numeric discounts to 0 and updates the recruiter document', async () => {
    mockReadBody.mockResolvedValue({
      uid: 'rec_1',
      basicDiscount: 'oops',
      exclusiveDiscount: undefined
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ basicDiscount: 0, exclusiveDiscount: 0 })
    );
  });
});
