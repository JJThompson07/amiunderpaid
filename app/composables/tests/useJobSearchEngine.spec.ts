import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useJobSearchEngine } from '../useJobSearchEngine';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  getFirestore: vi.fn(),
  Timestamp: { now: vi.fn() }
}));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn() }));

const mockRoute: { query: Record<string, string>; params: Record<string, string> } = {
  query: {},
  params: {}
};
vi.stubGlobal('useRoute', () => mockRoute);

type MockJobListing = {
  id?: number;
  salary_min?: number;
  salary_max?: number;
  category?: { label: string };
};
type MockJobsData = { results?: MockJobListing[] } | null;

const mockJobs = {
  fetchJobs: vi.fn(),
  jobsData: { value: null as MockJobsData },
  similarJobsData: { value: [] as MockJobListing[] },
  hasJobsData: { value: false },
  hasSimilarJobsData: { value: false },
  meanSalary: { value: 0 },
  dataProvider: { value: 'adzuna' },
  loading: { value: false }
};
vi.stubGlobal('useJobs', () => mockJobs);

vi.stubGlobal('useDevProviderOverride', () => ({ value: 'auto' }));

let lastAsyncDataKey = '';
vi.stubGlobal('useAsyncData', async (key: string, fetcher: () => Promise<unknown>) => {
  lastAsyncDataKey = key;
  await fetcher();
  return {
    data: { value: undefined },
    pending: { value: false },
    refresh: vi.fn()
  };
});

vi.stubGlobal('ref', <T>(val: T) => {
  return {
    get value(): T {
      return val;
    },
    set value(v: T) {
      val = v;
    }
  };
});
vi.stubGlobal('computed', <T>(fn: () => T) => ({
  get value(): T {
    return fn();
  }
}));

type WatchCallback = (value: unknown) => void;
const watchCallbacks: WatchCallback[] = [];
vi.stubGlobal('watch', (source: unknown, cb: WatchCallback) => {
  watchCallbacks.push(cb);
});
const mockNavigateTo = vi.fn();
vi.stubGlobal('navigateTo', mockNavigateTo);

describe('useJobSearchEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    watchCallbacks.length = 0;
    mockRoute.query = {};
    mockRoute.params = { title: 'software-engineer', country: 'uk' };
    mockJobs.jobsData.value = null;
    mockJobs.similarJobsData.value = [];
  });

  it('initializes route-derived state and fetches jobs with the full page size', async () => {
    const engine = await useJobSearchEngine();

    expect(engine.displayTitle.value).toBe('Software Engineer');
    expect(engine.country.value).toBe('UK');
    expect(engine.location.value).toBe('');
    expect(engine.sortMode.value).toBe('relevance');

    expect(mockJobs.fetchJobs).toHaveBeenCalledWith(
      'Software Engineer',
      '',
      'UK',
      'full-time',
      'permanent',
      'auto',
      undefined,
      100
    );
  });

  it('falls back to an empty display title when the title route param is missing', async () => {
    mockRoute.params = { title: '', country: 'uk' };
    const engine = await useJobSearchEngine();

    expect(engine.displayTitle.value).toBe('');
  });

  it('applies unslugify to a location route param and reports USA for a usa country param', async () => {
    mockRoute.params = { title: 'teacher', country: 'usa', location: 'new-york-city' };
    const engine = await useJobSearchEngine();

    expect(engine.country.value).toBe('USA');
    expect(engine.location.value).toBe('New York City');
  });

  it('parses schedule, contract, category, and sort from the route query', async () => {
    mockRoute.query = {
      schedule: 'part-time',
      contract: 'contract',
      category: 'it-jobs',
      sort: 'salary_max'
    };
    const engine = await useJobSearchEngine();

    expect(engine.jobType.value).toBe('part-time');
    expect(engine.contractType.value).toBe('contract');
    expect(engine.category.value).toBe('it-jobs');
    expect(engine.sortMode.value).toBe('salary_max');

    expect(mockJobs.fetchJobs).toHaveBeenCalledWith(
      'Software Engineer',
      '',
      'UK',
      'part-time',
      'contract',
      'auto',
      'it-jobs',
      100
    );
  });

  it('uses a distinct useAsyncData key per category so a category change triggers a new fetch', async () => {
    mockRoute.query = { category: 'it-jobs' };
    await useJobSearchEngine();
    const keyWithCategory = lastAsyncDataKey;

    mockRoute.query = {};
    await useJobSearchEngine();
    const keyWithoutCategory = lastAsyncDataKey;

    expect(keyWithCategory).not.toBe(keyWithoutCategory);
  });

  it('keeps relevance order untouched for sortedExactListings and sortedSimilarListings', async () => {
    mockJobs.jobsData.value = {
      results: [
        { id: 1, salary_max: 50 },
        { id: 2, salary_max: 90 }
      ]
    };
    mockJobs.similarJobsData.value = [
      { id: 3, salary_max: 40 },
      { id: 4, salary_max: 70 }
    ];

    const engine = await useJobSearchEngine();

    expect(engine.sortedExactListings.value.map((j) => j.id)).toEqual([1, 2]);
    expect(engine.sortedSimilarListings.value.map((j) => j.id)).toEqual([3, 4]);
  });

  it('sorts both tiers by salary_max descending', async () => {
    mockRoute.query = { sort: 'salary_max' };
    mockJobs.jobsData.value = {
      results: [
        { id: 1, salary_max: 50 },
        { id: 2, salary_max: 90 }
      ]
    };
    mockJobs.similarJobsData.value = [
      { id: 3, salary_max: 40 },
      { id: 4, salary_max: 70 }
    ];

    const engine = await useJobSearchEngine();

    expect(engine.sortedExactListings.value.map((j) => j.id)).toEqual([2, 1]);
    expect(engine.sortedSimilarListings.value.map((j) => j.id)).toEqual([4, 3]);
  });

  it('sorts by average of salary_min/salary_max descending', async () => {
    mockRoute.query = { sort: 'salary_avg' };
    mockJobs.jobsData.value = {
      results: [
        { id: 1, salary_min: 40, salary_max: 60 }, // avg 50
        { id: 2, salary_min: 80, salary_max: 100 } // avg 90
      ]
    };

    const engine = await useJobSearchEngine();

    expect(engine.sortedExactListings.value.map((j) => j.id)).toEqual([2, 1]);
  });

  it('falls back to salary_max/salary_min when only one bound is present for salary_avg sorting', async () => {
    mockRoute.query = { sort: 'salary_avg' };
    mockJobs.jobsData.value = {
      results: [
        { id: 1, salary_max: 30 },
        { id: 2, salary_min: 60 }
      ]
    };

    const engine = await useJobSearchEngine();

    expect(engine.sortedExactListings.value.map((j) => j.id)).toEqual([2, 1]);
  });

  it('sorts by salary_min ascending', async () => {
    mockRoute.query = { sort: 'salary_min' };
    mockJobs.jobsData.value = {
      results: [
        { id: 1, salary_min: 90 },
        { id: 2, salary_min: 30 }
      ]
    };

    const engine = await useJobSearchEngine();

    expect(engine.sortedExactListings.value.map((j) => j.id)).toEqual([2, 1]);
  });

  it('falls back to salary_max when salary_min is absent for salary_min sorting', async () => {
    mockRoute.query = { sort: 'salary_min' };
    mockJobs.jobsData.value = {
      results: [
        { id: 1, salary_max: 90 },
        { id: 2, salary_max: 20 }
      ]
    };

    const engine = await useJobSearchEngine();

    expect(engine.sortedExactListings.value.map((j) => j.id)).toEqual([2, 1]);
  });

  it('always sorts listings with no salary data to the bottom, even for an ascending salary_min sort', async () => {
    mockRoute.query = { sort: 'salary_min' };
    mockJobs.jobsData.value = {
      results: [
        { id: 1 }, // no salary data -- would otherwise sort first as 0
        { id: 2, salary_min: 50 },
        { id: 3 } // no salary data
      ]
    };

    const engine = await useJobSearchEngine();

    expect(engine.sortedExactListings.value.map((j) => j.id)).toEqual([2, 1, 3]);
  });

  it('keeps salaried listings ahead of unsalaried ones for salary_max and salary_avg too', async () => {
    mockJobs.jobsData.value = {
      results: [{ id: 1 }, { id: 2, salary_max: 50 }]
    };

    mockRoute.query = { sort: 'salary_max' };
    let engine = await useJobSearchEngine();
    expect(engine.sortedExactListings.value.map((j) => j.id)).toEqual([2, 1]);

    mockRoute.query = { sort: 'salary_avg' };
    engine = await useJobSearchEngine();
    expect(engine.sortedExactListings.value.map((j) => j.id)).toEqual([2, 1]);
  });

  it('defaults both listing tiers to empty arrays when there is no jobs data', async () => {
    const engine = await useJobSearchEngine();

    expect(engine.sortedExactListings.value).toEqual([]);
    expect(engine.sortedSimilarListings.value).toEqual([]);
    expect(engine.jobsCount.value).toBe(0);
  });

  it('computes jobsCount as the sum of both sorted tiers', async () => {
    mockJobs.jobsData.value = { results: [{ id: 1 }, { id: 2 }] };
    mockJobs.similarJobsData.value = [{ id: 3 }];

    const engine = await useJobSearchEngine();

    expect(engine.jobsCount.value).toBe(3);
  });

  it('derives adzunaCategory from the first exact-match result', async () => {
    mockJobs.jobsData.value = { results: [{ id: 1, category: { label: 'IT Jobs' } }] };

    const engine = await useJobSearchEngine();

    expect(engine.adzunaCategory.value).toBe('IT Jobs');
  });

  it('navigates with an updated sort query param when sortMode changes', async () => {
    await useJobSearchEngine();

    watchCallbacks.forEach((cb) => cb('salary_max'));

    expect(mockNavigateTo).toHaveBeenCalledWith(
      { query: expect.objectContaining({ sort: 'salary_max' }) },
      { replace: true }
    );
  });

  it('exposes pass-through state from useJobs', async () => {
    mockJobs.hasJobsData.value = true;
    mockJobs.hasSimilarJobsData.value = true;
    mockJobs.meanSalary.value = 75000;
    mockJobs.dataProvider.value = 'reed';

    const engine = await useJobSearchEngine();

    expect(engine.hasJobsData.value).toBe(true);
    expect(engine.hasSimilarJobsData.value).toBe(true);
    expect(engine.meanSalary.value).toBe(75000);
    expect(engine.dataProvider.value).toBe('reed');
    expect(engine.loading.value).toBe(false);
  });
});
