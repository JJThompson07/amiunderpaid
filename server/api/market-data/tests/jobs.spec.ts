import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';
import type { JobSearchResponse } from '~~/shared/utils/market-data';
import type * as FallbackUtils from '../../../utils/fallback';

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => 'server-timestamp')
  }
}));

let mockConfig: { adzunaAppId?: string; adzunaAppKey?: string };
vi.stubGlobal('useRuntimeConfig', () => mockConfig);
vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
const useAdminFirestoreMock = vi.fn();
vi.stubGlobal('useAdminFirestore', useAdminFirestoreMock);
const generateCacheKeyMock = vi.fn(() => 'cache-key');
vi.stubGlobal('generateCacheKey', generateCacheKeyMock);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});
vi.stubGlobal(
  'sanitizeAdzunaData',
  vi.fn(<T>(data: T): T => data)
);
// Adzuna (server/utils/adzuna.ts) is NOT mocked -- its real implementation
// runs against this stubbed global $fetch, the same way it does in
// production. This lets these tests exercise Adzuna's real param-building
// (location mapping, job/contract flags, category, title_only tiering)
// wherever Adzuna is reached, whether as the USA primary or the UK fallback.
const $fetchMock = vi.fn();
vi.stubGlobal('$fetch', $fetchMock);
const getQueryMock = vi.fn();
vi.stubGlobal('getQuery', getQueryMock);
// The stub still invokes getKey once so the option-object closure isn't dead code.
vi.stubGlobal(
  'defineCachedFunction',
  <T, O extends { getKey?: (...args: never[]) => string }>(fn: T, options?: O): T => {
    options?.getKey?.(
      'gb' as never,
      'engineer' as never,
      '' as never,
      'full-time' as never,
      'permanent' as never,
      false as never,
      undefined as never
    );
    return fn;
  }
);

vi.mock('../../../utils/reed', () => ({
  fetchReedData: vi.fn().mockResolvedValue({
    mean: 50000,
    count: 10,
    results: [{ id: 1, title: 'Reed Job', provider: 'reed' }],
    provider: 'reed'
  })
}));

vi.mock('../../../utils/jooble', () => ({
  fetchJoobleData: vi.fn().mockResolvedValue({
    mean: 100000,
    count: 20,
    results: [{ id: 2, title: 'Jooble Job', provider: 'jooble' }],
    provider: 'jooble'
  })
}));

vi.mock('../../../utils/fallback', async () => {
  const actual = await vi.importActual<typeof FallbackUtils>('../../../utils/fallback');
  return {
    ...actual,
    getMockFallbackJobs: vi.fn((provider: string) => ({
      mean: 60000,
      count: 1,
      results: [{ id: 99, title: 'E2E Fixture Job', provider }],
      provider
    }))
  };
});

type MockDocRef = {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
};

let jobsHandler: (event: H3Event) => Promise<JobSearchResponse>;

describe('market-data jobs endpoint', () => {
  let jobsCacheDocRef: MockDocRef;
  let categoryDocRef: MockDocRef;
  let jobsCategoryDocGet: ReturnType<typeof vi.fn>;
  let categoryDocIdSpy: ReturnType<typeof vi.fn<(id: string) => void>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.E2E;
    if (!jobsHandler) {
      jobsHandler = (await import('../jobs')).default;
    }

    mockConfig = { adzunaAppId: 'test-id', adzunaAppKey: 'test-key' };

    jobsCacheDocRef = {
      get: vi.fn().mockResolvedValue({ exists: false }),
      set: vi.fn().mockResolvedValue(undefined)
    };
    categoryDocRef = {
      get: vi.fn().mockResolvedValue({ exists: false }),
      set: vi.fn()
    };
    jobsCategoryDocGet = vi.fn().mockResolvedValue({ exists: false });
    categoryDocIdSpy = vi.fn();

    const mockDb = {
      collection: vi.fn((name: string) => {
        if (name === 'adzuna_jobs_cache') {
          return { doc: vi.fn(() => jobsCacheDocRef) };
        }
        if (name === 'adzuna_categories') {
          return {
            doc: vi.fn((id: string) => {
              categoryDocIdSpy(id);
              return categoryDocRef;
            })
          };
        }
        return { doc: vi.fn(() => ({ get: jobsCategoryDocGet })) };
      })
    };

    useAdminFirestoreMock.mockReturnValue(mockDb);
    // Default happy path is a UK request, which is now Reed-primary (mocked
    // above to always succeed) -- $fetch is only exercised by tests that
    // specifically target the Adzuna path (US primary, or UK fallback).
    getQueryMock.mockReturnValue({ title: 'developer', country: 'gb' });
    // Adzuna's real fetchAdzunaJobs relevance-filters and requires >= 3
    // salaried, title-relevant results to settle on Tier 1 without an extra
    // Tier 2 retry call -- so the default fixture must actually match the
    // default search title ('developer') and carry real salaries.
    $fetchMock.mockResolvedValue({
      count: 3,
      results: [
        {
          id: 1,
          title: 'Developer',
          salary_min: 40000,
          salary_max: 60000,
          category: { tag: 'unknown' }
        },
        {
          id: 2,
          title: 'Developer',
          salary_min: 42000,
          salary_max: 62000,
          category: { tag: 'unknown' }
        },
        {
          id: 3,
          title: 'Developer',
          salary_min: 44000,
          salary_max: 64000,
          category: { tag: 'unknown' }
        }
      ]
    });
  });

  it('400s when the title query param is missing', async () => {
    getQueryMock.mockReturnValue({});

    await expect(jobsHandler({} as unknown as H3Event)).rejects.toThrow('Job title is required');
    expect($fetchMock).not.toHaveBeenCalled();
  });

  it('503s when both the primary and fallback providers are misconfigured', async () => {
    mockConfig = {};
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us' });

    const { fetchJoobleData } = await import('../../../utils/jooble');
    vi.mocked(fetchJoobleData).mockRejectedValueOnce(
      Object.assign(new Error('Market data service is misconfigured.'), { statusCode: 500 })
    );

    await expect(jobsHandler({} as unknown as H3Event)).rejects.toThrow(
      'Market data temporarily unavailable. Please try again later.'
    );
  });

  it('clears a location that is just the country name so national stats are returned', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us', location: 'United States' });

    await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ params: expect.not.objectContaining({ where: expect.anything() }) })
    );
  });

  it('returns cached data immediately when a fresh expiresAt-based cache entry exists', async () => {
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        expiresAt: { toMillis: (): number => Date.now() + 100000 },
        data: { count: 1, results: [], provider: 'reed', cached: true },
        gov_id_code: 'soc_1',
        is_admin_verified: true
      })
    });

    const result = await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ cached: true, gov_id_code: 'soc_1', is_admin_verified: true })
    );
  });

  it('slices a cache hit down to the default limit (10) even though the cached document holds the full dual-tier payload', async () => {
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        expiresAt: { toMillis: (): number => Date.now() + 100000 },
        data: {
          mean: 50000,
          count: 30,
          provider: 'reed',
          results: Array.from({ length: 15 }, (_, i) => ({ id: i + 1, title: 'Developer' })),
          similarResults: Array.from({ length: 15 }, (_, i) => ({ id: i + 101, title: 'Dev' }))
        }
      })
    });

    const result = await jobsHandler({} as unknown as H3Event);

    expect(result.results).toHaveLength(10);
    expect(result.similarResults).toHaveLength(10);
  });

  it('falls through to a live fetch when the expiresAt-based cache entry has expired', async () => {
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        expiresAt: { toMillis: (): number => Date.now() - 100000 },
        data: { count: 1, results: [], provider: 'reed' }
      })
    });

    const { fetchReedData } = await import('../../../utils/reed');
    await jobsHandler({} as unknown as H3Event);

    expect(fetchReedData).toHaveBeenCalledTimes(1);
  });

  it('returns cached data via the legacy path when within the per-category cache window', async () => {
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        timestamp: { toMillis: (): number => Date.now() },
        categoryTag: 'it-jobs',
        data: { count: 1, results: [], provider: 'reed', cached: true }
      })
    });
    categoryDocRef.get.mockResolvedValue({ exists: true, data: () => ({ cache: 90 }) });

    const result = await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ cached: true }));
    expect(categoryDocIdSpy).toHaveBeenCalledWith('uk-it-jobs');
  });

  it('falls back to the nested data.categoryTag when the top-level categoryTag is absent', async () => {
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        timestamp: { toMillis: (): number => Date.now() },
        data: { count: 1, results: [], provider: 'reed', categoryTag: 'sales-jobs', cached: true }
      })
    });
    categoryDocRef.get.mockResolvedValue({ exists: true, data: () => ({ cache: 90 }) });

    const { fetchReedData } = await import('../../../utils/reed');
    await jobsHandler({} as unknown as H3Event);

    expect(fetchReedData).not.toHaveBeenCalled();
  });

  it('falls through to a live fetch via the legacy path once the category cache window has elapsed', async () => {
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        timestamp: { toMillis: (): number => Date.now() - 200 * 24 * 60 * 60 * 1000 },
        categoryTag: '',
        data: { count: 1, results: [], provider: 'reed' }
      })
    });

    const { fetchReedData } = await import('../../../utils/reed');
    await jobsHandler({} as unknown as H3Event);

    expect(fetchReedData).toHaveBeenCalledTimes(1);
    expect(categoryDocRef.get).not.toHaveBeenCalled();
  });

  it('silently ignores a cache-read failure and falls through to a live fetch', async () => {
    jobsCacheDocRef.get.mockRejectedValue(new Error('firestore down'));

    const result = await jobsHandler({} as unknown as H3Event);

    expect(result.count).toBe(10);
    expect(result.provider).toBe('reed');
  });

  it('treats a UK cache entry not sourced from Reed as stale and fetches fresh Reed data', async () => {
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        expiresAt: { toMillis: (): number => Date.now() + 100000 },
        data: { count: 1, results: [], provider: 'adzuna', cached: true }
      })
    });

    const { fetchReedData } = await import('../../../utils/reed');
    const result = await jobsHandler({} as unknown as H3Event);

    expect(fetchReedData).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe('reed');
  });

  it('does not treat a non-UK cache entry as stale regardless of provider', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us' });
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        expiresAt: { toMillis: (): number => Date.now() + 100000 },
        data: { count: 1, results: [], provider: 'jooble', cached: true }
      })
    });

    await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
  });

  it('sets part_time and contract params when jobType and contractType request them (US/Adzuna primary)', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      country: 'us',
      jobType: 'part-time',
      contractType: 'contract'
    });

    await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ params: expect.objectContaining({ part_time: 1, contract: 1 }) })
    );
  });

  it('sets neither full_time/part_time nor contract/permanent when given an unrecognized type', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      country: 'us',
      jobType: 'flexible',
      contractType: 'temporary'
    });

    await jobsHandler({} as unknown as H3Event);

    const params = $fetchMock.mock.calls[0]![1].params;
    expect(params).not.toHaveProperty('full_time');
    expect(params).not.toHaveProperty('part_time');
    expect(params).not.toHaveProperty('contract');
    expect(params).not.toHaveProperty('permanent');
  });

  it('maps a UI location slug to its Adzuna string via ADZUNA_LOCATION_MAP', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      country: 'us',
      location: 'London, Greater London'
    });

    await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        params: expect.objectContaining({ where: 'London', distance: 20 })
      })
    );
  });

  it('uses Reed as the UK primary provider by default', async () => {
    const result = await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(result.provider).toBe('reed');
    expect(result.count).toBe(10);
  });

  it('falls back to Adzuna when Reed fails for a UK request', async () => {
    const { fetchReedData } = await import('../../../utils/reed');
    vi.mocked(fetchReedData).mockRejectedValueOnce({ statusCode: 500, response: { status: 500 } });

    const result = await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe('adzuna');

    expect(jobsCacheDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ provider: 'adzuna' })
      }),
      { merge: true }
    );
  });

  it('falls back to Adzuna when Reed returns zero results for a UK request', async () => {
    const { fetchReedData } = await import('../../../utils/reed');
    vi.mocked(fetchReedData).mockResolvedValueOnce({
      mean: 0,
      count: 0,
      results: [],
      provider: 'reed'
    });

    const result = await jobsHandler({} as unknown as H3Event);

    expect(result.provider).toBe('adzuna');
  });

  it('wraps a non-provider-shaped fetch failure in a 503 without attempting a fallback', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us' });
    $fetchMock.mockRejectedValueOnce(new Error('unexpected bug, no status code'));

    const { fetchJoobleData } = await import('../../../utils/jooble');
    await expect(jobsHandler({} as unknown as H3Event)).rejects.toThrow(
      'Market data temporarily unavailable. Please try again later.'
    );
    expect(fetchJoobleData).not.toHaveBeenCalled();
  });

  it('reads the per-category cacheDays for a Reed-sourced UK response with a known category', async () => {
    categoryDocRef.get.mockResolvedValue({ exists: true, data: () => ({ cache: 45 }) });
    getQueryMock.mockReturnValue({ title: 'developer', country: 'gb', category: 'it-jobs' });

    const beforeExpected = new Date();
    beforeExpected.setDate(beforeExpected.getDate() + 45);
    await jobsHandler({} as unknown as H3Event);
    const afterExpected = new Date();
    afterExpected.setDate(afterExpected.getDate() + 45);

    // Looks up the same collection/doc-ID shape /admin/adzuna writes to
    // (`adzuna_categories/uk-<tag>`), not the dead `adzuna_category` collection.
    expect(categoryDocIdSpy).toHaveBeenCalledWith('uk-it-jobs');
    const setCall = jobsCacheDocRef.set.mock.calls[0]![0];
    expect(setCall.categoryTag).toBe('it-jobs');
    const expiresAtMs = (setCall.expiresAt as Date).getTime();
    // Calendar-day setDate() arithmetic (matching the source code), not raw
    // ms multiplication, so this stays correct across a DST boundary that a
    // 45-day-out projection can land on.
    expect(expiresAtMs).toBeGreaterThanOrEqual(beforeExpected.getTime());
    expect(expiresAtMs).toBeLessThanOrEqual(afterExpected.getTime());
  });

  it('resolves an independent cacheDays override for the same category tag in the USA (usa-<tag> doc)', async () => {
    categoryDocRef.get.mockResolvedValue({ exists: true, data: () => ({ cache: 10 }) });
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us', category: 'it-jobs' });

    const beforeExpected = new Date();
    beforeExpected.setDate(beforeExpected.getDate() + 10);
    await jobsHandler({} as unknown as H3Event);
    const afterExpected = new Date();
    afterExpected.setDate(afterExpected.getDate() + 10);

    // A USA request for the same bare tag ('it-jobs') must resolve the
    // 'usa-it-jobs' document, never the UK ('uk-it-jobs') override.
    expect(categoryDocIdSpy).toHaveBeenCalledWith('usa-it-jobs');
    expect(categoryDocIdSpy).not.toHaveBeenCalledWith('uk-it-jobs');
    const setCall = jobsCacheDocRef.set.mock.calls[0]![0];
    const expiresAtMs = (setCall.expiresAt as Date).getTime();
    expect(expiresAtMs).toBeGreaterThanOrEqual(beforeExpected.getTime());
    expect(expiresAtMs).toBeLessThanOrEqual(afterExpected.getTime());
  });

  it('returns the static E2E fixture without calling $fetch when a reed devProvider override is set', async () => {
    process.env.E2E = 'true';
    getQueryMock.mockReturnValue({ title: 'developer', country: 'gb', devProvider: 'reed' });

    const result = await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(jobsCacheDocRef.get).not.toHaveBeenCalled();
    expect(result.provider).toBe('reed');
    expect(result.results[0]?.title).toBe('E2E Fixture Job');
  });

  it('returns the static E2E fixture without calling $fetch when a jooble devProvider override is set', async () => {
    process.env.E2E = 'true';
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us', devProvider: 'jooble' });

    const result = await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(result.provider).toBe('jooble');
  });

  it('returns the static E2E fixture without calling $fetch when an adzuna devProvider override is set', async () => {
    process.env.E2E = 'true';
    getQueryMock.mockReturnValue({ title: 'developer', country: 'gb', devProvider: 'adzuna' });

    const result = await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(result.provider).toBe('adzuna');
  });

  it('never persists a dev/E2E provider-override response to the shared cache, even under a real-world title', async () => {
    // A pinned/fixture response for a commonly-searched title (e.g.
    // "software engineer") must never overwrite the real cache entry an
    // organic, non-overridden search for the same title/location/country
    // would read from.
    process.env.E2E = 'true';
    getQueryMock.mockReturnValue({
      title: 'software engineer',
      country: 'gb',
      devProvider: 'reed'
    });

    await jobsHandler({} as unknown as H3Event);

    expect(jobsCacheDocRef.set).not.toHaveBeenCalled();
  });

  it('should fall back to Jooble API if Adzuna returns 429 for usa', async () => {
    getQueryMock.mockReturnValue({
      title: 'Software Engineer',
      country: 'us'
    });

    $fetchMock.mockRejectedValueOnce({
      response: { status: 429 }
    });

    const result = await jobsHandler({} as unknown as H3Event);
    expect(result.provider).toBe('jooble');
    expect(result.count).toBe(20);
    expect(result.results[0]?.title).toBe('Jooble Job');
  });

  it('should fall back to Jooble API if Adzuna returns 0 results for usa', async () => {
    getQueryMock.mockReturnValue({
      title: 'Software Engineer',
      country: 'us'
    });

    // Both the Tier 1 and Tier 2 Adzuna attempts must return zero here, since
    // a lone mockResolvedValueOnce would let Tier 2 fall through to the rich
    // default fixture and silently rescue the "primary" response.
    $fetchMock.mockResolvedValue({
      count: 0,
      results: []
    });

    const result = await jobsHandler({} as unknown as H3Event);
    expect(result.provider).toBe('jooble');
    expect(result.count).toBe(20);
  });

  it('caches an Adzuna-sourced USA primary response for the configured cacheDays (default 30)', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      location: 'new york',
      country: 'us',
      resultsPerPage: '10'
    });

    // Title must relevance-match the 'developer' search term: Adzuna no longer
    // retries an identical Tier 2 request when the anchor phrase is a no-op
    // (see server/utils/adzuna.ts), so Tier 1 alone must succeed here.
    $fetchMock.mockResolvedValueOnce({
      count: 1,
      results: [
        {
          id: 1,
          title: 'Developer',
          salary_min: 40000,
          salary_max: 60000,
          category: { tag: 'unknown' }
        }
      ]
    });

    const before = Date.now();
    await jobsHandler({} as unknown as H3Event);
    const after = Date.now();

    const setCall = jobsCacheDocRef.set.mock.calls[0]![0];
    const expiresAtMs = (setCall.expiresAt as Date).getTime();
    const expectedMin = before + 30 * 24 * 60 * 60 * 1000;
    const expectedMax = after + 30 * 24 * 60 * 60 * 1000;

    expect(expiresAtMs).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAtMs).toBeLessThanOrEqual(expectedMax);
  });

  it('persists the full dual-tier payload to Firestore but slices the response to the default limit (10) when resultsPerPage is omitted', async () => {
    // No resultsPerPage -- the exact shape useLocationEngine.ts sends for
    // /salary and /benchmark, which must keep seeing 10 results after this
    // change, not the full up-to-100 payload now persisted to the cache.
    getQueryMock.mockReturnValue({ title: 'senior developer', country: 'us' });

    const buildJob = (
      id: number,
      title: string
    ): {
      id: number;
      title: string;
      salary_min: number;
      salary_max: number;
      category: { tag: string };
    } => ({
      id,
      title,
      salary_min: 40000 + id,
      salary_max: 60000 + id,
      category: { tag: 'unknown' }
    });

    // Tier 1 ("Senior Developer", full match) and Tier 2 ("Developer", partial
    // match against the anchor-phrase retry) each return 15 distinct,
    // non-overlapping ids so dedup doesn't collapse either tier below 10.
    $fetchMock
      .mockResolvedValueOnce({
        count: 15,
        results: Array.from({ length: 15 }, (_, i) => buildJob(i + 1, 'Senior Developer'))
      })
      .mockResolvedValueOnce({
        count: 15,
        results: Array.from({ length: 15 }, (_, i) => buildJob(i + 101, 'Developer'))
      });

    const response = await jobsHandler({} as unknown as H3Event);

    expect(response.results).toHaveLength(10);
    expect(response.similarResults).toHaveLength(10);

    const setCall = jobsCacheDocRef.set.mock.calls[0]![0];
    expect(setCall.data.results).toHaveLength(15);
    expect(setCall.data.similarResults).toHaveLength(15);
  });

  it('forwards a category filter to Adzuna and to generateCacheKey (USA primary)', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us', category: 'IT-Jobs' });

    await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ params: expect.objectContaining({ category: 'it-jobs' }) })
    );
    expect(generateCacheKeyMock).toHaveBeenCalledWith('developer', '', 'us', 'it-jobs');
  });

  it('omits the category param entirely when none is provided', async () => {
    await jobsHandler({} as unknown as H3Event);

    expect(generateCacheKeyMock).toHaveBeenCalledWith('developer', '', 'gb', '');
  });

  it('uses the explicit category filter as categoryTag instead of the derived result category', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us', category: 'sales-jobs' });
    $fetchMock.mockResolvedValueOnce({
      count: 1,
      results: [{ id: 1, title: 'Adzuna Job', category: { tag: 'it-jobs' } }]
    });

    await jobsHandler({} as unknown as H3Event);

    const setCall = jobsCacheDocRef.set.mock.calls[0]![0];
    expect(setCall.categoryTag).toBe('sales-jobs');
    expect(setCall.searchParams.category).toBe('sales-jobs');
  });

  it('stores a null category in searchParams when no filter is provided', async () => {
    await jobsHandler({} as unknown as H3Event);

    const setCall = jobsCacheDocRef.set.mock.calls[0]![0];
    expect(setCall.searchParams.category).toBe(null);
  });

  it('forwards the category filter to the fallback provider when Reed fails for gb', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'gb', category: 'it-jobs' });
    const { fetchReedData } = await import('../../../utils/reed');
    vi.mocked(fetchReedData).mockRejectedValueOnce({ statusCode: 500, response: { status: 500 } });

    await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ params: expect.objectContaining({ category: 'it-jobs' }) })
    );
  });

  it('caches a fallback-sourced response for 24 hours regardless of cacheDays', async () => {
    const { fetchReedData } = await import('../../../utils/reed');
    vi.mocked(fetchReedData).mockRejectedValueOnce({ statusCode: 500, response: { status: 500 } });

    const before = Date.now();
    await jobsHandler({} as unknown as H3Event);
    const after = Date.now();

    const setCall = jobsCacheDocRef.set.mock.calls[0]![0];
    const expiresAtMs = (setCall.expiresAt as Date).getTime();
    const expectedMin = before + 24 * 60 * 60 * 1000;
    const expectedMax = after + 24 * 60 * 60 * 1000;

    expect(expiresAtMs).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAtMs).toBeLessThanOrEqual(expectedMax);
  });
});
