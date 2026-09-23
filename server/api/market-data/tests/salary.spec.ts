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
// production, wherever Adzuna is actually reached (USA primary, UK fallback).
const $fetchMock = vi.fn();
vi.stubGlobal('$fetch', $fetchMock);
const getQueryMock = vi.fn();
vi.stubGlobal('getQuery', getQueryMock);
vi.stubGlobal(
  'defineCachedFunction',
  <T, O extends { getKey?: (...args: never[]) => string }>(fn: T, options?: O): T => {
    options?.getKey?.(
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
    mean: 50000,
    count: 1,
    results: [],
    histogram: { '50000': 1 },
    provider: 'reed'
  })
}));

vi.mock('../../../utils/jooble', () => ({
  fetchJoobleData: vi.fn().mockResolvedValue({
    mean: 100000,
    count: 1,
    results: [],
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
  let categoryDocIdSpy: ReturnType<typeof vi.fn<(id: string) => void>>;

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

    categoryDocIdSpy = vi.fn();

    const mockDb = {
      collection: vi.fn((name: string) => {
        if (name === 'adzuna_distribution_cache') {
          return { doc: vi.fn(() => distributionCacheDocRef) };
        }
        if (name === 'adzuna_categories') {
          return {
            doc: vi.fn((id: string) => {
              categoryDocIdSpy(id);
              return categoryDocRef;
            })
          };
        }
        return { doc: vi.fn(() => jobsCacheDocRef) };
      })
    };

    useAdminFirestoreMock.mockReturnValue(mockDb);
    // Default happy path is a UK request, which is now Reed-primary (mocked
    // above to always succeed) -- $fetch is only exercised by tests that
    // specifically target the Adzuna histogram path (US primary, or UK
    // fallback). Adzuna's histogram endpoint has no per-job relevance
    // filtering (see adzuna.ts), just a Tier 1 -> Tier 2 bucket-count check,
    // so a >= 3-bucket fixture is enough to settle on Tier 1 in one call.
    getQueryMock.mockReturnValue({ title: 'developer', country: 'gb' });
    // Reachable through two different real Adzuna functions depending on the
    // path under test: fetchAdzunaHistogram (US primary -- reads only
    // `.histogram`) and, via executeMarketFallback, fetchAdzunaJobs (UK
    // fallback -- reads `.results`/`.count` and relevance-filters them, so
    // they must actually match the default search title 'developer' with
    // real salaries). One fixture carries both shapes so either call site
    // settles on Tier 1 without an extra Tier 2 retry call.
    $fetchMock.mockResolvedValue({
      histogram: { '40000': 3, '50000': 5, '60000': 2 },
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

    await expect(salaryHandler({} as unknown as H3Event)).rejects.toThrow('Job title is required');
    expect($fetchMock).not.toHaveBeenCalled();
  });

  it('503s when both the primary and fallback providers are misconfigured', async () => {
    mockConfig = {};
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us' });

    const { fetchJoobleData } = await import('../../../utils/jooble');
    vi.mocked(fetchJoobleData).mockRejectedValueOnce(
      Object.assign(new Error('Market data service is misconfigured.'), { statusCode: 500 })
    );

    await expect(salaryHandler({} as unknown as H3Event)).rejects.toThrow(
      'Salary data temporarily unavailable. Please try again later.'
    );
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
      country: 'us',
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
        data: { histogram: { '50000': 9 }, provider: 'reed', cached: true },
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
        data: { histogram: {}, provider: 'reed' }
      })
    });

    const { fetchReedData } = await import('../../../utils/reed');
    await salaryHandler({} as unknown as H3Event);

    expect(fetchReedData).toHaveBeenCalledTimes(1);
  });

  it('returns cached data via the legacy path when within the per-category cache window', async () => {
    distributionCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        timestamp: { toMillis: (): number => Date.now() },
        categoryTag: 'it-jobs',
        data: { histogram: { '50000': 9 }, provider: 'reed', cached: true }
      })
    });
    categoryDocRef.get.mockResolvedValue({ exists: true, data: () => ({ cache: 90 }) });

    const result = await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ cached: true }));
    expect(categoryDocIdSpy).toHaveBeenCalledWith('uk-it-jobs');
  });

  it('falls back to the nested data.categoryTag when the top-level categoryTag is absent', async () => {
    distributionCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        timestamp: { toMillis: (): number => Date.now() },
        data: {
          histogram: { '50000': 9 },
          provider: 'reed',
          categoryTag: 'sales-jobs',
          cached: true
        }
      })
    });
    categoryDocRef.get.mockResolvedValue({ exists: true, data: () => ({ cache: 90 }) });

    const { fetchReedData } = await import('../../../utils/reed');
    await salaryHandler({} as unknown as H3Event);

    expect(fetchReedData).not.toHaveBeenCalled();
  });

  it('falls through to a live fetch via the legacy path once the category cache window has elapsed', async () => {
    distributionCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        timestamp: { toMillis: (): number => Date.now() - 200 * 24 * 60 * 60 * 1000 },
        categoryTag: '',
        data: { histogram: {}, provider: 'reed' }
      })
    });

    const { fetchReedData } = await import('../../../utils/reed');
    await salaryHandler({} as unknown as H3Event);

    expect(fetchReedData).toHaveBeenCalledTimes(1);
    expect(categoryDocRef.get).not.toHaveBeenCalled();
  });

  it('silently ignores a cache-read failure and falls through to a live fetch', async () => {
    distributionCacheDocRef.get.mockRejectedValue(new Error('firestore down'));

    const result = await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(result.histogram).toEqual({ '50000': 1 });
  });

  it('treats a UK cache entry not sourced from Reed as stale and fetches fresh Reed data', async () => {
    distributionCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        expiresAt: { toMillis: (): number => Date.now() + 100000 },
        data: { histogram: { '50000': 9 }, provider: 'adzuna', cached: true }
      })
    });

    const { fetchReedData } = await import('../../../utils/reed');
    const result = await salaryHandler({} as unknown as H3Event);

    expect(fetchReedData).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe('reed');
  });

  it('does not treat a non-UK cache entry as stale regardless of provider', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us' });
    distributionCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        expiresAt: { toMillis: (): number => Date.now() + 100000 },
        data: { histogram: { '100000': 3 }, provider: 'jooble', cached: true }
      })
    });

    await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
  });

  it('steals the categoryTag from the matching jobs cache entry for an Adzuna-sourced response', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us' });
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ categoryTag: 'it-jobs' })
    });
    categoryDocRef.get.mockResolvedValue({ exists: true, data: () => ({ cache: 45 }) });

    const beforeExpected = new Date();
    beforeExpected.setDate(beforeExpected.getDate() + 45);
    await salaryHandler({} as unknown as H3Event);
    const afterExpected = new Date();
    afterExpected.setDate(afterExpected.getDate() + 45);

    const setCall = distributionCacheDocRef.set.mock.calls[0]![0];
    expect(setCall.categoryTag).toBe('it-jobs');
    const expiresAtMs = (setCall.expiresAt as Date).getTime();
    // Calendar-day setDate() arithmetic (matching the source code), not raw
    // ms multiplication, so this stays correct across a DST boundary that a
    // 45-day-out projection can land on.
    expect(expiresAtMs).toBeGreaterThanOrEqual(beforeExpected.getTime());
    expect(expiresAtMs).toBeLessThanOrEqual(afterExpected.getTime());
    // Looks up the same collection/doc-ID shape /admin/adzuna writes to
    // (`adzuna_categories/usa-<tag>`), not the dead `adzuna_category` collection.
    expect(categoryDocIdSpy).toHaveBeenCalledWith('usa-it-jobs');
  });

  it('resolves an independent cacheDays override for the same category tag in the UK (uk-<tag> doc)', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'gb', category: 'it-jobs' });
    categoryDocRef.get.mockResolvedValue({ exists: true, data: () => ({ cache: 5 }) });

    const beforeExpected = new Date();
    beforeExpected.setDate(beforeExpected.getDate() + 5);
    await salaryHandler({} as unknown as H3Event);
    const afterExpected = new Date();
    afterExpected.setDate(afterExpected.getDate() + 5);

    // A UK request for the same bare tag ('it-jobs') must resolve the
    // 'uk-it-jobs' document, never the USA ('usa-it-jobs') override.
    expect(categoryDocIdSpy).toHaveBeenCalledWith('uk-it-jobs');
    expect(categoryDocIdSpy).not.toHaveBeenCalledWith('usa-it-jobs');
    const setCall = distributionCacheDocRef.set.mock.calls[0]![0];
    const expiresAtMs = (setCall.expiresAt as Date).getTime();
    expect(expiresAtMs).toBeGreaterThanOrEqual(beforeExpected.getTime());
    expect(expiresAtMs).toBeLessThanOrEqual(afterExpected.getTime());
  });

  it('silently ignores a jobs-cache read failure and leaves categoryTag as unknown', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us' });
    jobsCacheDocRef.get.mockRejectedValue(new Error('firestore down'));

    const result = await salaryHandler({} as unknown as H3Event);

    expect(result.provider).toBe('adzuna');
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

  it('returns the static E2E fixture without calling $fetch when an adzuna devProvider override is set', async () => {
    process.env.E2E = 'true';
    getQueryMock.mockReturnValue({ title: 'developer', country: 'gb', devProvider: 'adzuna' });

    const result = await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(result.provider).toBe('adzuna');
  });

  it('wraps a non-provider-shaped fetch failure in a 503 without attempting a fallback', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us' });
    $fetchMock.mockRejectedValueOnce(new Error('unexpected bug, no status code'));

    const { fetchJoobleData } = await import('../../../utils/jooble');
    await expect(salaryHandler({} as unknown as H3Event)).rejects.toThrow(
      'Salary data temporarily unavailable. Please try again later.'
    );
    expect(fetchJoobleData).not.toHaveBeenCalled();
  });

  it('uses Reed as the UK primary provider by default', async () => {
    const result = await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(result.provider).toBe('reed');
    expect(result.histogram).toEqual({ '50000': 1 });
  });

  it('falls back to Adzuna when Reed fails for a UK request', async () => {
    const { fetchReedData } = await import('../../../utils/reed');
    vi.mocked(fetchReedData).mockRejectedValueOnce({ statusCode: 500, response: { status: 500 } });

    const result = await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe('adzuna');

    expect(distributionCacheDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ provider: 'adzuna' })
      })
    );
  });

  it('falls back to Adzuna when Reed returns an empty histogram for a UK request', async () => {
    const { fetchReedData } = await import('../../../utils/reed');
    vi.mocked(fetchReedData).mockResolvedValueOnce({
      mean: 0,
      count: 0,
      results: [],
      histogram: {},
      provider: 'reed'
    });

    const result = await salaryHandler({} as unknown as H3Event);

    expect(result.provider).toBe('adzuna');
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

  it('should fall back to Jooble API if Adzuna returns an empty histogram for usa', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      location: 'new york',
      country: 'usa'
    });

    // Both the Tier 1 and Tier 2 Adzuna attempts must return empty here,
    // since a lone mockResolvedValueOnce would let Tier 2 fall through to
    // the rich default fixture and silently rescue the "primary" response.
    $fetchMock.mockResolvedValue({ histogram: {} });

    const result = await salaryHandler({} as unknown as H3Event);
    expect(result.provider).toBe('jooble');
    expect(result.histogram).toEqual({ '100000': 2 });
  });

  it('caches an Adzuna-sourced USA primary response for the configured cacheDays (default 30)', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      location: 'new york',
      country: 'usa'
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

  it('forwards a category filter to Adzuna and to generateCacheKey (USA primary)', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us', category: 'IT-Jobs' });

    await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ params: expect.objectContaining({ category: 'it-jobs' }) })
    );
    expect(generateCacheKeyMock).toHaveBeenCalledWith('developer', '', 'us', 'it-jobs');
  });

  it('omits the category param entirely when none is provided', async () => {
    await salaryHandler({} as unknown as H3Event);

    expect(generateCacheKeyMock).toHaveBeenCalledWith('developer', '', 'gb', '');
  });

  it('uses the explicit category filter as categoryTag even though the jobs cache is still read for histogram reuse', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'gb', category: 'sales-jobs' });

    await salaryHandler({} as unknown as H3Event);

    // The jobs cache is read once now regardless of whether categoryTag is
    // already known -- that read is for histogram reuse (see design.md
    // Decision 5), a separate purpose from the categoryTag-steal logic below,
    // which correctly never overrides an explicit category filter.
    expect(jobsCacheDocRef.get).toHaveBeenCalledTimes(1);
    const setCall = distributionCacheDocRef.set.mock.calls[0]![0];
    expect(setCall.categoryTag).toBe('sales-jobs');
    expect(setCall.searchParams.category).toBe('sales-jobs');
  });

  it('stores a null category in searchParams when no filter is provided', async () => {
    await salaryHandler({} as unknown as H3Event);

    const setCall = distributionCacheDocRef.set.mock.calls[0]![0];
    expect(setCall.searchParams.category).toBe(null);
  });

  it('forwards the category filter to the fallback provider when Reed fails for gb', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'gb', category: 'it-jobs' });
    const { fetchReedData } = await import('../../../utils/reed');
    vi.mocked(fetchReedData).mockRejectedValueOnce({ statusCode: 500, response: { status: 500 } });

    await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ params: expect.objectContaining({ category: 'it-jobs' }) })
    );
  });

  it('reuses a fresh Reed-sourced jobs cache entry instead of calling fetchReedData a second time', async () => {
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        categoryTag: 'it-jobs',
        expiresAt: { toMillis: (): number => Date.now() + 100000 },
        data: { histogram: { '65000': 4 }, provider: 'reed' }
      })
    });

    const { fetchReedData } = await import('../../../utils/reed');
    const result = await salaryHandler({} as unknown as H3Event);

    expect(fetchReedData).not.toHaveBeenCalled();
    expect(result.provider).toBe('reed');
    expect(result.histogram).toEqual({ '65000': 4 });
    const setCall = distributionCacheDocRef.set.mock.calls[0]![0];
    expect(setCall.categoryTag).toBe('it-jobs');
  });

  it('reuses a fresh Jooble-sourced jobs cache entry instead of calling fetchJoobleData a second time', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us' });
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        expiresAt: { toMillis: (): number => Date.now() + 100000 },
        data: { histogram: { '95000': 2 }, provider: 'jooble' }
      })
    });

    const { fetchJoobleData } = await import('../../../utils/jooble');
    const result = await salaryHandler({} as unknown as H3Event);

    expect(fetchJoobleData).not.toHaveBeenCalled();
    expect($fetchMock).not.toHaveBeenCalled();
    expect(result.provider).toBe('jooble');
    expect(result.histogram).toEqual({ '95000': 2 });
  });

  it('falls through to a live fetch with real jobType/contractType filters on a jobs-cache miss', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      country: 'gb',
      jobType: 'part-time',
      contractType: 'contract'
    });
    jobsCacheDocRef.get.mockResolvedValue({ exists: false });

    const { fetchReedData } = await import('../../../utils/reed');
    await salaryHandler({} as unknown as H3Event);

    expect(fetchReedData).toHaveBeenCalledWith('developer', '', 'part-time', 'contract', '');
  });

  it('does not reuse a jobs cache entry sourced from Adzuna, leaving Adzuna path unchanged', async () => {
    getQueryMock.mockReturnValue({ title: 'developer', country: 'us' });
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        expiresAt: { toMillis: (): number => Date.now() + 100000 },
        data: { histogram: { '80000': 6 }, provider: 'adzuna' }
      })
    });

    const result = await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe('adzuna');
  });

  it('does not reuse an expired jobs cache entry, falling through to a live fetch', async () => {
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        expiresAt: { toMillis: (): number => Date.now() - 100000 },
        data: { histogram: { '65000': 4 }, provider: 'reed' }
      })
    });

    const { fetchReedData } = await import('../../../utils/reed');
    const result = await salaryHandler({} as unknown as H3Event);

    expect(fetchReedData).toHaveBeenCalledTimes(1);
    expect(result.histogram).toEqual({ '50000': 1 });
  });

  it('does not let jobs-cache histogram reuse override a devProvider-pinned E2E fixture', async () => {
    process.env.E2E = 'true';
    getQueryMock.mockReturnValue({ title: 'developer', country: 'gb', devProvider: 'reed' });
    // Even if a fresh, reusable Reed jobs-cache entry exists, the pinned E2E
    // fixture path (skipCache) must take priority and never be overridden by
    // the jobs-cache reuse mechanism.
    jobsCacheDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        expiresAt: { toMillis: (): number => Date.now() + 100000 },
        data: { histogram: { '99999': 1 }, provider: 'reed' }
      })
    });

    const result = await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).not.toHaveBeenCalled();
    expect(result.histogram).toEqual({ '55000': 4 });
  });

  it('caches a fallback-sourced response for 24 hours and does not inherit categoryTag from the jobs cache', async () => {
    const { fetchReedData } = await import('../../../utils/reed');
    vi.mocked(fetchReedData).mockRejectedValueOnce({ statusCode: 500, response: { status: 500 } });

    const before = Date.now();
    await salaryHandler({} as unknown as H3Event);
    const after = Date.now();

    // Read once for the (missed) histogram-reuse attempt; the categoryTag-steal
    // block correctly still skips a second read because isFallbackProvider is true.
    expect(jobsCacheDocRef.get).toHaveBeenCalledTimes(1);

    const setCall = distributionCacheDocRef.set.mock.calls[0]![0];
    expect(setCall.categoryTag).toBe('unknown');

    const expiresAtMs = (setCall.expiresAt as Date).getTime();
    const expectedMin = before + 24 * 60 * 60 * 1000;
    const expectedMax = after + 24 * 60 * 60 * 1000;

    expect(expiresAtMs).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAtMs).toBeLessThanOrEqual(expectedMax);
  });
});
