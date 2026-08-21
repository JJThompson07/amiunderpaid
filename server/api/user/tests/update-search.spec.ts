import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';
type UpdateSearchHandler = (event: H3Event) => Promise<{ success: boolean; error?: string }>;

const { mockUpdate, mockGetFirestore } = vi.hoisted(() => {
  const mockUpdate = vi.fn();
  const mockGetFirestore = vi.fn(() => ({
    collection: vi.fn(() => ({ doc: vi.fn(() => ({ update: mockUpdate })) }))
  }));
  return { mockUpdate, mockGetFirestore };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: mockGetFirestore
}));

const mockVerifySearchToken = vi.fn();
vi.stubGlobal('verifySearchToken', mockVerifySearchToken);

let mockConfig: { searchTokenSecret?: string };
vi.stubGlobal('useRuntimeConfig', () => mockConfig);
vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

describe('update-search endpoint', () => {
  let handler: UpdateSearchHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../update-search.post');
    handler = mod.default as unknown as UpdateSearchHandler;

    mockConfig = { searchTokenSecret: 'test-secret' };
    mockVerifySearchToken.mockReturnValue(true);
    mockUpdate.mockResolvedValue(undefined);
    mockReadBody.mockResolvedValue({ id: 'doc_123', token: 'valid-token', mcaScore: 42 });
  });

  it('returns success: false when id or token is missing', async () => {
    mockReadBody.mockResolvedValue({ id: 'doc_123' });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: false, error: 'Missing search ID or token' });
    expect(mockVerifySearchToken).not.toHaveBeenCalled();
  });

  it('fails closed with a 500 when searchTokenSecret is not configured', async () => {
    mockConfig = {};
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Server misconfiguration.');
    expect(mockVerifySearchToken).not.toHaveBeenCalled();
  });

  it('rejects an invalid token with a 403', async () => {
    mockVerifySearchToken.mockReturnValue(false);
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Forbidden');
    expect(mockVerifySearchToken).toHaveBeenCalledWith('doc_123', 'valid-token', 'test-secret');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('applies the update when the token is valid', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith({ mcaScore: 42 });
  });

  it('silently returns success: false if the Firestore update fails', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('Firestore is down'));
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: false });
  });
});
