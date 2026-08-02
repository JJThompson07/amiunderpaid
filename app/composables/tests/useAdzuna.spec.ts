import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdzuna } from '../useAdzuna';

vi.mock('firebase/firestore', () => ({ doc: vi.fn(), collection: vi.fn(), getFirestore: vi.fn(), Timestamp: { now: vi.fn() } }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn() }));

const stateCache: Record<string, any> = {};
vi.stubGlobal('useState', (key: string, init: any) => {
  if (!(key in stateCache)) {
    stateCache[key] = { value: init ? init() : null };
  }
  return stateCache[key];
});

vi.stubGlobal('computed', (fn: any) => {
  return {
    get value() {
      return fn();
    }
  };
});

const mock$fetch = vi.fn();
vi.stubGlobal('$fetch', mock$fetch);

describe('useAdzuna', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(stateCache).forEach((key) => delete stateCache[key]);
  });

  it('fetchJobs success populates jobsData', async () => {
    mock$fetch.mockResolvedValueOnce({
      mean: 50000,
      count: 10,
      results: [{ title: 'Developer' }]
    });

    const composable = useAdzuna();
    await composable.fetchJobs('Developer', 'London', 'gb');

    expect(mock$fetch).toHaveBeenCalledWith('/api/adzuna/jobs', {
      params: { title: 'Developer', location: 'London', country: 'gb', jobType: 'full-time', contractType: 'permanent' }
    });
    expect(composable.jobsData.value).toEqual({
      mean: 50000,
      count: 10,
      results: [{ title: 'Developer' }]
    });
    expect(composable.hasJobsData.value).toBe(true);
    expect(composable.meanSalary.value).toBe(50000);
  });

  it('fetchJobs error clears jobsData', async () => {
    mock$fetch.mockRejectedValueOnce(new Error('Failed'));
    
    const composable = useAdzuna();
    await composable.fetchJobs('Developer', 'London', 'gb');
    
    expect(composable.jobsData.value).toBe(null);
    expect(composable.hasJobsData.value).toBe(false);
  });

  it('fetchHistogram success populates distributionData', async () => {
    mock$fetch.mockResolvedValueOnce({
      histogram: { 10000: 5, 20000: 10 }
    });

    const composable = useAdzuna();
    await composable.fetchHistogram('Developer', 'London', 'gb');

    expect(composable.distributionData.value).toEqual({
      histogram: { '10000': 5, '20000': 10 }
    });
    expect(composable.hasDistributionData.value).toBe(true);
    expect(composable.histogramBuckets.value).toEqual([
      { value: 10000, count: 5 },
      { value: 20000, count: 10 }
    ]);
  });

  it('fetchCategories success populates categories', async () => {
    mock$fetch.mockResolvedValueOnce({
      results: [{ label: 'IT', tag: 'it-jobs' }]
    });

    const composable = useAdzuna();
    await composable.fetchCategories('usa'); // usa maps to us

    expect(mock$fetch).toHaveBeenCalledWith('/api/adzuna/categories', {
      params: { country: 'us' }
    });
    expect(composable.categories.value).toEqual([{ label: 'IT', tag: 'it-jobs' }]);
  });

  it('isUnderpaid returns true if salary is less than mean', () => {
    stateCache['adzuna_jobs'] = { value: { mean: 60000, count: 5 } };
    const composable = useAdzuna();
    expect(composable.hasJobsData.value).toBe(true);
    expect(composable.isUnderpaid(50000)).toBe(true);
    expect(composable.isUnderpaid(70000)).toBe(false);
  });

  it('isUnderpaid returns false if no jobs data', () => {
    const composable = useAdzuna();
    expect(composable.isUnderpaid(50000)).toBe(false);
  });
});
