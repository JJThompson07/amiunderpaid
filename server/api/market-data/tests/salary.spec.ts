import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';
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
vi.stubGlobal(
  'defineCachedFunction',
  <T, O extends { getKey?: (...args: never[]) => string }>(fn: T, options?: O): T => {
    options?.getKey?.(
      {} as never,
      'gb' as never,
      'engineer' as never,
      '' as never,
      false as never,
      undefined as never
    );
    return fn;
  }
);

vi.mock('../../../utils/reed', () => ({
  fetchReedData: vi.fn().mockResolvedValue({
    histogram: { '50000': 1 },
    provider: 'reed'
  })
}));

vi.mock('../../../utils/jooble', () => ({
  fetchJoobleData: vi.fn().mockResolvedValue({
    histogram: { '100000': 2 },
    provider: 'jooble'
  })
}));

vi.mock('../../../utils/fallback', async () => {
  const actual = await vi.importActual<typeof FallbackUtils>('../../../utils/fallback');
  return {
    ...actual,
    getMockFallbackHistogram: vi.fn((provider: string) => ({
      histogram: { '55000': 4 },
      provider
    }))
  };
});

type MockDocRef = {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
};

// Mirrors the (unexported) `MarketSalaryResult` shape returned by ../salary,
// scoped down to the fields these tests actually assert on.
type SalaryApiResult = {
  histogram?: Record<string, number>;
  provider: string;
};

let salaryHandler: (event: H3Event) => Promise<SalaryApiResult>;

describe('market-data salary endpoint', () => {
  let distributionCacheDocRef: MockDocRef;
  let categoryDocRef: MockDocRef;
  let jobsCacheDocRef: MockDocRef;

  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.E2E;
    if (!salaryHandler) {
      salaryHandler = (await import('../salary')).default;
    }

    mockConfig = { adzunaAppId: 'test-id', adzunaAppKey: 'test-key' };

    distributionCacheDocRef = {
      get: vi.fn().mockResolvedValue({ exists: false }),
      set: vi.fn().mockResolvedValue(undefined)
    };
    categoryDocRef = {
      get: vi.fn().mockResolvedValue({ exists: false }),
      set: vi.fn()
    };
    jobsCacheDocRef = {
      get: vi.fn().mockResolvedValue({ exists: false }),
      set: vi.fn()
    };

    const mockDb = {
      collection: vi.fn((name: string) => {
        if (name === 'adzuna_distribution_cache') {
          return { doc: vi.fn(() => distributionCacheDocRef) };
        }
        if (name === 'adzuna_category') {
          return { doc: vi.fn(() => categoryDocRef) };
        }
        return { doc: vi.fn(() => jobsCacheDocRef) };
      })
    };

    useAdminFirestoreMock.mockReturnValue(mockDb);
    getQueryMock.mockReturnValue({ title: 'developer', country: 'gb' });
    $fetchMock.mockResolvedValue({ histogram: { '50000': 1 } });
  });

  it('400s when the title query param is missing', async () => {
    getQueryMock.mockReturnValue({});

    await expect(salaryHandler({} as unknown as H3Event)).rejects.toThrow('Job title is required');
    expect($fetchMock).not.toHaveBeenCalled();
  });

  it('500s when Adzuna credentials are not configured', async () => {
    mockConfig = {};

    await expect(salaryHandler({} as unknown as H3Event)).rejects.toThrow(
      'Market data service is misconfigured.'
    );
    expect($fetchMock).not.toHaveBeenCalled();
  });

  it('clears a location that is just the country name so national stats are returned', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us', location: 'USA' });

    await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ params: expect.not.objectContaining({ where: expect.anything() }) })
    );
  });

  it('maps a UI location slug to its Adzuna string via ADZUNA_LOCATION_MAP', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      country: 'gb',
      location: 'London, Greater London'
    });

    await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ params: expect.objectContaining({ where: 'London' }) })
    );
  });

  it('returns cached data immediately when a fresh expiresAt-based cache entry exists', async () => {
    distributionCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        expiresAt: { toMillis: (): number => Date.now() + 100000 },
        data: { histogram: { '50000': 9 }, cached: true },
        gov_id_code: 'soc_1'
      })
    });

    const result = await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ cached: true, gov_id_code: 'soc_1' }));
  });

  it('falls through to a live fetch when the expiresAt-based cache entry has expired', async () => {
    distributionCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        expiresAt: { toMillis: (): number => Date.now() - 100000 },
        data: { histogram: {} }
      })
    });

    await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns cached data via the legacy path when within the per-category cache window', async () => {
    distributionCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        timestamp: { toMillis: (): number => Date.now() },
        categoryTag: 'it-jobs',
        data: { histogram: { '50000': 9 }, cached: true }
      })
    });
    categoryDocRef.get.mockResolvedValue({ exists: true, data: () => ({ cache: 90 }) });

    const result = await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ cached: true }));
  });

  it('falls back to the nested data.categoryTag when the top-level categoryTag is absent', async () => {
    distributionCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        timestamp: { toMillis: (): number => Date.now() },
        data: { histogram: { '50000': 9 }, categoryTag: 'sales-jobs', cached: true }
      })
    });
    categoryDocRef.get.mockResolvedValue({ exists: true, data: () => ({ cache: 90 }) });

    await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
  });

  it('falls through to a live fetch via the legacy path once the category cache window has elapsed', async () => {
    distributionCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        timestamp: { toMillis: (): number => Date.now() - 200 * 24 * 60 * 60 * 1000 },
        categoryTag: '',
        data: { histogram: {} }
      })
    });

    await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledTimes(1);
    expect(categoryDocRef.get).not.toHaveBeenCalled();
  });

  it('silently ignores a cache-read failure and falls through to a live fetch', async () => {
    distributionCacheDocRef.get.mockRejectedValue(new Error('firestore down'));

    const result = await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledTimes(1);
    expect(result.histogram).toEqual({ '50000': 1 });
  });

  it('steals the categoryTag from the matching jobs cache entry for an Adzuna-sourced response', async () => {
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ categoryTag: 'it-jobs' })
    });
    categoryDocRef.get.mockResolvedValue({ exists: true, data: () => ({ cache: 45 }) });

    const before = Date.now();
    await salaryHandler({} as unknown as H3Event);
    const after = Date.now();

    const setCall = distributionCacheDocRef.set.mock.calls[0]![0];
    expect(setCall.categoryTag).toBe('it-jobs');
    const expiresAtMs = (setCall.expiresAt as Date).getTime();
    expect(expiresAtMs).toBeGreaterThanOrEqual(before + 45 * 24 * 60 * 60 * 1000);
    expect(expiresAtMs).toBeLessThanOrEqual(after + 45 * 24 * 60 * 60 * 1000);
  });

  it('silently ignores a jobs-cache read failure and leaves categoryTag as unknown', async () => {
    jobsCacheDocRef.get.mockRejectedValue(new Error('firestore down'));

    const result = await salaryHandler({} as unknown as H3Event);

    expect(result.histogram).toEqual({ '50000': 1 });
    const setCall = distributionCacheDocRef.set.mock.calls[0]![0];
    expect(setCall.categoryTag).toBe('unknown');
  });

  it('returns the static E2E fixture without calling $fetch when a reed devProvider override is set', async () => {
    process.env.E2E = 'true';
    getQueryMock.mockReturnValue({ title: 'developer', country: 'gb', devProvider: 'reed' });

    const result = await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(distributionCacheDocRef.get).not.toHaveBeenCalled();
    expect(result.provider).toBe('reed');
    expect(result.histogram).toEqual({ '55000': 4 });
  });

  it('returns the static E2E fixture without calling $fetch when a jooble devProvider override is set', async () => {
    process.env.E2E = 'true';
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us', devProvider: 'jooble' });

    const result = await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(result.provider).toBe('jooble');
  });

  it('wraps a non-fallback fetch failure in a 503', async () => {
    $fetchMock.mockRejectedValueOnce(new Error('network unreachable'));

    await expect(salaryHandler({} as unknown as H3Event)).rejects.toThrow(
      'Salary data temporarily unavailable. Please try again later.'
    );
  });

  it('falls back to Reed when Adzuna returns a 403', async () => {
    $fetchMock.mockRejectedValueOnce({ statusCode: 403, response: { status: 403 } });

    const result = await salaryHandler({} as unknown as H3Event);

    expect(result.provider).toBe('reed');
  });

  it('should fall back to Reed API if Adzuna returns 429 for gb', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      location: 'london',
      country: 'gb'
    });

    $fetchMock.mockRejectedValueOnce({
      statusCode: 429,
      response: { status: 429 }
    });

    const result = await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe('reed');
    expect(result.histogram).toEqual({ '50000': 1 });

    expect(distributionCacheDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ provider: 'reed', histogram: { '50000': 1 } })
      })
    );
  });

  it('should fall back to Jooble API if Adzuna returns 429 for usa', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      location: 'new york',
      country: 'usa'
    });

    $fetchMock.mockRejectedValueOnce({
      statusCode: 429,
      response: { status: 429 }
    });

    const result = await salaryHandler({} as unknown as H3Event);
    expect(result.provider).toBe('jooble');
    expect(result.histogram).toEqual({ '100000': 2 });
  });

  it('should fall back to Jooble API if Adzuna returns empty histogram for usa', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      location: 'new york',
      country: 'usa'
    });

    $fetchMock.mockResolvedValueOnce({
      histogram: {}
    });

    const result = await salaryHandler({} as unknown as H3Event);
    expect(result.provider).toBe('jooble');
    expect(result.histogram).toEqual({ '100000': 2 });
  });

  it('caches an Adzuna-sourced response for the configured cacheDays (default 30)', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      location: 'london',
      country: 'gb'
    });

    $fetchMock.mockResolvedValueOnce({
      histogram: { '50000': 1 }
    });

    const before = Date.now();
    await salaryHandler({} as unknown as H3Event);
    const after = Date.now();

    const setCall = distributionCacheDocRef.set.mock.calls[0]![0];
    const expiresAtMs = (setCall.expiresAt as Date).getTime();
    const expectedMin = before + 30 * 24 * 60 * 60 * 1000;
    const expectedMax = after + 30 * 24 * 60 * 60 * 1000;

    expect(expiresAtMs).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAtMs).toBeLessThanOrEqual(expectedMax);
  });

  it('caches a fallback-sourced response for 24 hours and does not inherit categoryTag from the jobs cache', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      location: 'london',
      country: 'gb'
    });

    $fetchMock.mockRejectedValueOnce({
      statusCode: 429,
      response: { status: 429 }
    });

    const before = Date.now();
    await salaryHandler({} as unknown as H3Event);
    const after = Date.now();

    expect(jobsCacheDocRef.get).not.toHaveBeenCalled();

    const setCall = distributionCacheDocRef.set.mock.calls[0]![0];
    expect(setCall.categoryTag).toBe('unknown');

    const expiresAtMs = (setCall.expiresAt as Date).getTime();
    const expectedMin = before + 24 * 60 * 60 * 1000;
    const expectedMax = after + 24 * 60 * 60 * 1000;

    expect(expiresAtMs).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAtMs).toBeLessThanOrEqual(expectedMax);
  });
});
