import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';
import type { ReExpireCategoryCacheSummary } from '../../../utils/cacheReExpiry';

type ReExpireHandler = (
  event: H3Event
) => Promise<{ success: boolean; updatedJobs: number; updatedDistributions: number }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

const mockUseAdminFirestore = vi.fn(() => ({}));
vi.stubGlobal('useAdminFirestore', mockUseAdminFirestore);

const { mockReExpireCategoryCache } = vi.hoisted(() => ({
  mockReExpireCategoryCache: vi.fn()
}));

vi.mock('../../../utils/cacheReExpiry', () => ({
  reExpireCategoryCache: mockReExpireCategoryCache
}));

describe('admin re-expire-category-cache endpoint', () => {
  let handler: ReExpireHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../re-expire-category-cache.post');
    handler = mod.default as unknown as ReExpireHandler;

    const summary: ReExpireCategoryCacheSummary = { updatedJobs: 0, updatedDistributions: 0 };
    mockReExpireCategoryCache.mockResolvedValue(summary);
  });

  // Admin authorization itself is enforced globally by
  // server/middleware/admin-guard.ts (covered by admin-guard.spec.ts), the
  // same pattern used by grant-admin.post.ts -- this endpoint has no
  // separate auth branch of its own to test.

  it('rejects a missing categories field with a 400', async () => {
    mockReadBody.mockResolvedValue({});

    await expect(handler({} as unknown as H3Event)).rejects.toThrow(
      'A non-empty list of { tag, country, cacheDays } categories is required.'
    );
    expect(mockReExpireCategoryCache).not.toHaveBeenCalled();
  });

  it('rejects an empty categories array with a 400', async () => {
    mockReadBody.mockResolvedValue({ categories: [] });

    await expect(handler({} as unknown as H3Event)).rejects.toThrow(
      'A non-empty list of { tag, country, cacheDays } categories is required.'
    );
  });

  it('rejects a malformed category entry (bad country value) with a 400', async () => {
    mockReadBody.mockResolvedValue({
      categories: [{ tag: 'it-jobs', country: 'FR', cacheDays: 1 }]
    });

    await expect(handler({} as unknown as H3Event)).rejects.toThrow(
      'A non-empty list of { tag, country, cacheDays } categories is required.'
    );
  });

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['non-integer', 1.5]
  ])('rejects a %s cacheDays value with a 400', async (_label, cacheDays) => {
    mockReadBody.mockResolvedValue({
      categories: [{ tag: 'it-jobs', country: 'UK', cacheDays }]
    });

    await expect(handler({} as unknown as H3Event)).rejects.toThrow(
      'A non-empty list of { tag, country, cacheDays } categories is required.'
    );
    expect(mockReExpireCategoryCache).not.toHaveBeenCalled();
  });

  it('maps UK/USA to gb/us and delegates to reExpireCategoryCache per category', async () => {
    mockReadBody.mockResolvedValue({
      categories: [
        { tag: 'it-jobs', country: 'UK', cacheDays: 1 },
        { tag: 'sales-jobs', country: 'USA', cacheDays: 5 }
      ]
    });
    mockReExpireCategoryCache
      .mockResolvedValueOnce({ updatedJobs: 2, updatedDistributions: 1 })
      .mockResolvedValueOnce({ updatedJobs: 3, updatedDistributions: 0 });

    const res = await handler({} as unknown as H3Event);

    expect(mockReExpireCategoryCache).toHaveBeenNthCalledWith(1, expect.anything(), {
      categoryTag: 'it-jobs',
      countryCode: 'gb',
      cacheDays: 1
    });
    expect(mockReExpireCategoryCache).toHaveBeenNthCalledWith(2, expect.anything(), {
      categoryTag: 'sales-jobs',
      countryCode: 'us',
      cacheDays: 5
    });
    expect(res).toEqual({ success: true, updatedJobs: 5, updatedDistributions: 1 });
  });

  it('wraps a re-expiry failure in an opaque 500', async () => {
    mockReadBody.mockResolvedValue({
      categories: [{ tag: 'it-jobs', country: 'UK', cacheDays: 1 }]
    });
    mockReExpireCategoryCache.mockRejectedValueOnce(new Error('firestore down'));

    await expect(handler({} as unknown as H3Event)).rejects.toThrow(
      'Failed to re-expire cached category results.'
    );
  });
});
