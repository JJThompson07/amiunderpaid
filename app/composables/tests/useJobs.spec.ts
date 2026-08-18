import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useJobs } from '../useJobs';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  getFirestore: vi.fn(),
  Timestamp: { now: vi.fn() }
}));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn() }));

const stateCache = new Map<string, { value: unknown }>();
vi.stubGlobal('useState', (key: string, init?: () => unknown) => {
  if (!stateCache.has(key)) {
    stateCache.set(key, { value: init ? init() : null });
  }
  return stateCache.get(key);
});

vi.stubGlobal('computed', (fn: () => unknown) => {
  return {
    get value(): unknown {
      return fn();
    }
  };
});

const mock$fetch = vi.fn();
vi.stubGlobal('$fetch', mock$fetch);

describe('useJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stateCache.clear();
  });

  it('fetchJobs success populates jobsData', async () => {
    mock$fetch.mockResolvedValueOnce({
      mean: 50000,
      count: 10,
      results: [{ title: 'Developer' }]
    });

    const composable = useJobs();
    await composable.fetchJobs('Developer', 'London', 'gb');

    expect(mock$fetch).toHaveBeenCalledWith('/api/market-data/jobs', {
      params: {
        title: 'Developer',
        location: 'London',
        country: 'gb',
        jobType: 'full-time',
        contractType: 'permanent',
        devProvider: undefined
      }
    });
    expect(composable.jobsData.value).toEqual({
      mean: 50000,
      count: 10,
      results: [{ title: 'Developer' }],
      provider: 'adzuna'
    });
    expect(composable.hasJobsData.value).toBe(true);
    expect(composable.meanSalary.value).toBe(50000);
  });

  it('fetchJobs error clears jobsData', async () => {
    mock$fetch.mockRejectedValueOnce(new Error('Failed'));

    const composable = useJobs();
    await composable.fetchJobs('Developer', 'London', 'gb');

    expect(composable.jobsData.value).toBe(null);
    expect(composable.hasJobsData.value).toBe(false);
  });

  it('fetchJobs passes devProviderOverride when provided', async () => {
    mock$fetch.mockResolvedValueOnce({ mean: 10, count: 1, results: [] });
    const composable = useJobs();
    await composable.fetchJobs('Developer', 'London', 'gb', 'full-time', 'permanent', 'reed');

    expect(mock$fetch).toHaveBeenCalledWith('/api/market-data/jobs', {
      params: {
        title: 'Developer',
        location: 'London',
        country: 'gb',
        jobType: 'full-time',
        contractType: 'permanent',
        devProvider: 'reed'
      }
    });
  });

  it('fetchJobs coerces devProviderOverride "auto" to undefined in params', async () => {
    mock$fetch.mockResolvedValueOnce({ mean: 10, count: 1, results: [] });
    const composable = useJobs();
    await composable.fetchJobs('Developer', 'London', 'gb', 'full-time', 'permanent', 'auto');

    expect(mock$fetch).toHaveBeenCalledWith('/api/market-data/jobs', {
      params: {
        title: 'Developer',
        location: 'London',
        country: 'gb',
        jobType: 'full-time',
        contractType: 'permanent',
        devProvider: undefined
      }
    });
  });

  it('fetchJobs handles gov_id_code correctly when admin verified', async () => {
    mock$fetch.mockResolvedValueOnce({
      mean: 50000,
      count: 10,
      results: [],
      gov_id_code: ' GOV-123 ',
      is_admin_verified: true
    });

    const composable = useJobs();
    await composable.fetchJobs('Developer', 'London', 'gb');

    expect(composable.cachedGovIdCode.value).toBe('GOV-123');
  });

  it('fetchJobs ignores gov_id_code if not admin verified', async () => {
    mock$fetch.mockResolvedValueOnce({
      mean: 50000,
      count: 10,
      results: [],
      gov_id_code: ' GOV-123 ',
      is_admin_verified: false
    });

    const composable = useJobs();
    await composable.fetchJobs('Developer', 'London', 'gb');

    expect(composable.cachedGovIdCode.value).toBe(undefined);
  });

  it('fetchHistogram success populates distributionData', async () => {
    mock$fetch.mockResolvedValueOnce({
      histogram: { 10000: 5, 20000: 10 }
    });

    const composable = useJobs();
    await composable.fetchHistogram('Developer', 'London', 'gb');

    expect(composable.distributionData.value).toEqual({
      histogram: { '10000': 5, '20000': 10 },
      provider: 'adzuna'
    });
    expect(composable.hasDistributionData.value).toBe(true);
    expect(composable.histogramBuckets.value).toEqual([
      { value: 10000, count: 5 },
      { value: 20000, count: 10 }
    ]);
    expect(composable.histogramRange.value).toBe(10000); // 20000 - 10000
    expect(composable.histogramMaxCount.value).toBe(10);
    expect(composable.histogramTotalCount.value).toBe(15);
  });

  it('fetchHistogram error clears distributionData and returns early for range', async () => {
    mock$fetch.mockRejectedValueOnce(new Error('Failed'));

    const composable = useJobs();
    await composable.fetchHistogram('Developer', 'London', 'gb');

    expect(composable.distributionData.value).toBe(null);
    expect(composable.hasDistributionData.value).toBe(false);
    expect(composable.histogramRange.value).toBe(0);
    expect(composable.histogramMaxCount.value).toBe(1);
    expect(composable.histogramTotalCount.value).toBe(0);
  });

  it('fetchCategories success populates categories', async () => {
    mock$fetch.mockResolvedValueOnce({
      results: [{ label: 'IT', tag: 'it-jobs' }]
    });

    const composable = useJobs();
    await composable.fetchCategories('usa'); // usa maps to us

    expect(mock$fetch).toHaveBeenCalledWith('/api/market-data/categories', {
      params: { country: 'us' }
    });
    expect(composable.categories.value).toEqual([{ label: 'IT', tag: 'it-jobs' }]);
  });

  it('fetchCategories success applies sanitizeAdzunaData correctly', async () => {
    mock$fetch.mockResolvedValueOnce({
      results: [
        {
          label: 'IT',
          tag: 'it-jobs',
          __hidden__: 'secret',
          nested: { __internal__: 1, valid: true }
        },
        null,
        'string'
      ],
      __proto__: 'hacked'
    });

    const composable = useJobs();
    await composable.fetchCategories('gb');

    // Should remove keys starting and ending with __
    expect(composable.categories.value).toEqual([
      { label: 'IT', tag: 'it-jobs', nested: { valid: true } },
      null,
      'string'
    ]);
  });

  it('isUnderpaid returns true if salary is less than mean', () => {
    stateCache.set('market_data_jobs', { value: { mean: 60000, count: 5 } });
    const composable = useJobs();
    expect(composable.hasJobsData.value).toBe(true);
    expect(composable.isUnderpaid(50000)).toBe(true);
    expect(composable.isUnderpaid(70000)).toBe(false);
  });

  it('isUnderpaid returns false if no jobs data', () => {
    const composable = useJobs();
    expect(composable.isUnderpaid(50000)).toBe(false);
  });

  it('dataProvider returns provider from jobsData when available', () => {
    stateCache.set('market_data_jobs', { value: { mean: 50000, count: 5, provider: 'reed' } });
    const composable = useJobs();
    expect(composable.dataProvider.value).toBe('reed');
  });

  it('dataProvider falls back to distributionData provider when jobsData has none', () => {
    stateCache.set('market_data_jobs', { value: null });
    stateCache.set('market_data_distribution', { value: { histogram: {}, provider: 'reed' } });
    const composable = useJobs();
    expect(composable.dataProvider.value).toBe('reed');
  });

  it('dataProvider defaults to adzuna when neither source has a provider', () => {
    stateCache.set('market_data_jobs', { value: null });
    stateCache.set('market_data_distribution', { value: null });
    const composable = useJobs();
    expect(composable.dataProvider.value).toBe('adzuna');
  });
});
