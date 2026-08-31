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
vi.stubGlobal(
  'generateCacheKey',
  vi.fn(() => 'cache-key')
);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});
vi.stubGlobal(
  'sanitizeAdzunaData',
  vi.fn(<T>(data: T): T => data)
);
const $fetchMock = vi.fn();
vi.stubGlobal('$fetch', $fetchMock);
const getQueryMock = vi.fn();
vi.stubGlobal('getQuery', getQueryMock);
// The stub still invokes getKey once so the option-object closure isn't dead code.
vi.stubGlobal(
  'defineCachedFunction',
  <T, O extends { getKey?: (...args: never[]) => string }>(fn: T, options?: O): T => {
    options?.getKey?.(
      {} as never,
      'gb' as never,
      'engineer' as never,
      '' as never,
      'full-time' as never,
      'permanent' as never,
      10 as never,
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

    const mockDb = {
      collection: vi.fn((name: string) => {
        if (name === 'adzuna_jobs_cache') {
          return { doc: vi.fn(() => jobsCacheDocRef) };
        }
        if (name === 'adzuna_category') {
          return { doc: vi.fn(() => categoryDocRef) };
        }
        return { doc: vi.fn(() => ({ get: jobsCategoryDocGet })) };
      })
    };

    useAdminFirestoreMock.mockReturnValue(mockDb);
    getQueryMock.mockReturnValue({ title: 'developer', country: 'gb' });
    $fetchMock.mockResolvedValue({ count: 1, results: [{ id: 1, title: 'Adzuna Job' }] });
  });

  it('400s when the title query param is missing', async () => {
    getQueryMock.mockReturnValue({});

    await expect(jobsHandler({} as unknown as H3Event)).rejects.toThrow('Job title is required');
    expect($fetchMock).not.toHaveBeenCalled();
  });

  it('500s when Adzuna credentials are not configured', async () => {
    mockConfig = {};

    await expect(jobsHandler({} as unknown as H3Event)).rejects.toThrow(
      'Market data service is misconfigured.'
    );
    expect($fetchMock).not.toHaveBeenCalled();
  });

  it('clears a location that is just the country name so national stats are returned', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'gb', location: 'United Kingdom' });

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
        data: { count: 1, results: [], cached: true },
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

  it('falls through to a live fetch when the expiresAt-based cache entry has expired', async () => {
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        expiresAt: { toMillis: (): number => Date.now() - 100000 },
        data: { count: 1, results: [] }
      })
    });

    await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns cached data via the legacy path when within the per-category cache window', async () => {
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        timestamp: { toMillis: (): number => Date.now() },
        categoryTag: 'it-jobs',
        data: { count: 1, results: [], cached: true }
      })
    });
    categoryDocRef.get.mockResolvedValue({ exists: true, data: () => ({ cache: 90 }) });

    const result = await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ cached: true }));
  });

  it('falls back to the nested data.categoryTag when the top-level categoryTag is absent', async () => {
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        timestamp: { toMillis: (): number => Date.now() },
        data: { count: 1, results: [], categoryTag: 'sales-jobs', cached: true }
      })
    });
    categoryDocRef.get.mockResolvedValue({ exists: true, data: () => ({ cache: 90 }) });

    await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
  });

  it('falls through to a live fetch via the legacy path once the category cache window has elapsed', async () => {
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        timestamp: { toMillis: (): number => Date.now() - 200 * 24 * 60 * 60 * 1000 },
        categoryTag: '',
        data: { count: 1, results: [] }
      })
    });

    await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledTimes(1);
    expect(categoryDocRef.get).not.toHaveBeenCalled();
  });

  it('silently ignores a cache-read failure and falls through to a live fetch', async () => {
    jobsCacheDocRef.get.mockRejectedValue(new Error('firestore down'));

    const result = await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledTimes(1);
    expect(result.count).toBe(1);
  });

  it('sets part_time and contract params when jobType and contractType request them', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      country: 'gb',
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
      country: 'gb',
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
      country: 'gb',
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

  it('falls back to Reed when Adzuna returns a 403', async () => {
    $fetchMock.mockRejectedValueOnce({ statusCode: 403, response: { status: 403 } });

    const result = await jobsHandler({} as unknown as H3Event);

    expect(result.provider).toBe('reed');
  });

  it('wraps a non-fallback fetch failure in a 503', async () => {
    $fetchMock.mockRejectedValueOnce(new Error('network unreachable'));

    await expect(jobsHandler({} as unknown as H3Event)).rejects.toThrow(
      'Market data temporarily unavailable. Please try again later.'
    );
  });

  it('reads the per-category cacheDays for an Adzuna-sourced response with a known category', async () => {
    $fetchMock.mockResolvedValueOnce({
      count: 1,
      results: [{ id: 1, title: 'Adzuna Job', category: { tag: 'it-jobs' } }]
    });
    categoryDocRef.get.mockResolvedValue({ exists: true, data: () => ({ cache: 45 }) });

    const before = Date.now();
    await jobsHandler({} as unknown as H3Event);
    const after = Date.now();

    const setCall = jobsCacheDocRef.set.mock.calls[0]![0];
    expect(setCall.categoryTag).toBe('it-jobs');
    const expiresAtMs = (setCall.expiresAt as Date).getTime();
    expect(expiresAtMs).toBeGreaterThanOrEqual(before + 45 * 24 * 60 * 60 * 1000);
    expect(expiresAtMs).toBeLessThanOrEqual(after + 45 * 24 * 60 * 60 * 1000);
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

  it('should fall back to Reed API if Adzuna returns 429 for gb', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      location: 'london',
      country: 'gb',
      resultsPerPage: '10'
    });

    $fetchMock.mockRejectedValueOnce({
      statusCode: 429,
      response: { status: 429 }
    });

    const result = await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe('reed');
    expect(result.count).toBe(10);
    expect(result.results[0]?.title).toBe('Reed Job');

    expect(jobsCacheDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ provider: 'reed' })
      }),
      { merge: true }
    );
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

    $fetchMock.mockResolvedValueOnce({
      count: 0,
      results: []
    });

    const result = await jobsHandler({} as unknown as H3Event);
    expect(result.provider).toBe('jooble');
    expect(result.count).toBe(20);
  });

  it('caches an Adzuna-sourced response for the configured cacheDays (default 30)', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      location: 'london',
      country: 'gb',
      resultsPerPage: '10'
    });

    $fetchMock.mockResolvedValueOnce({
      count: 1,
      results: [{ id: 1, title: 'Adzuna Job', category: { tag: 'unknown' } }]
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

  it('caches a fallback-sourced response for 24 hours regardless of cacheDays', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      location: 'london',
      country: 'gb',
      resultsPerPage: '10'
    });

    $fetchMock.mockRejectedValueOnce({
      statusCode: 429,
      response: { status: 429 }
    });

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
