import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';
import type { PurgeSummary } from '../../../utils/cachePurge';

type CleanCacheHandler = (event: H3Event) => Promise<{
  success: boolean;
  message: string;
  stats: { deletedJobs: number; deletedDistributions: number };
}>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});

const mockVerifyAdmin = vi.fn();
vi.stubGlobal('verifyAdmin', mockVerifyAdmin);

const { mockPurgeExpiredCache } = vi.hoisted(() => ({
  mockPurgeExpiredCache: vi.fn()
}));

vi.mock('../../../utils/cachePurge', () => ({
  purgeExpiredCache: mockPurgeExpiredCache
}));

describe('admin clean-cache endpoint', () => {
  let handler: CleanCacheHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../clean-cache.post');
    handler = mod.default as unknown as CleanCacheHandler;

    mockVerifyAdmin.mockResolvedValue(undefined);
  });

  it('requires admin authorization before purging', async () => {
    const summary: PurgeSummary = { deletedJobs: 2, deletedDistributions: 1 };
    mockPurgeExpiredCache.mockResolvedValue(summary);
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockVerifyAdmin).toHaveBeenCalledWith(event);
  });

  it('delegates to purgeExpiredCache and returns unified stats', async () => {
    const summary: PurgeSummary = { deletedJobs: 2, deletedDistributions: 1 };
    mockPurgeExpiredCache.mockResolvedValue(summary);
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({
      success: true,
      message: 'Cache cleaned successfully.',
      stats: { deletedJobs: 2, deletedDistributions: 1 }
    });
  });

  it('wraps a purge failure in an opaque 500', async () => {
    mockPurgeExpiredCache.mockRejectedValueOnce(new Error('firestore down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to clean cache');
  });

  it('wraps a non-Error throw with an "Unknown error" data message', async () => {
    mockPurgeExpiredCache.mockRejectedValueOnce('a string rejection');
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to clean cache');
  });
});
