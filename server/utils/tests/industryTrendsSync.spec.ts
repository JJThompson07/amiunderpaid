import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncSummary } from '../industryTrendsSync';

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'server-timestamp') }
}));

const mockConfig = { adzunaAppId: 'test-id', adzunaAppKey: 'test-key' };
vi.stubGlobal('useRuntimeConfig', () => mockConfig);
vi.stubGlobal('createError', (err: { statusCode?: number; statusMessage?: string }) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});
const $fetchMock = vi.fn();
vi.stubGlobal('$fetch', $fetchMock);
const useAdminFirestoreMock = vi.fn();
vi.stubGlobal('useAdminFirestore', useAdminFirestoreMock);
const removeItemMock = vi.fn().mockResolvedValue(undefined);
vi.stubGlobal('useStorage', () => ({ removeItem: removeItemMock }));

const makeSnapshot = (docs: unknown[]): { docs: { data: () => unknown }[] } => ({
  docs: docs.map((data) => ({ data: () => data }))
});

type DocSetFn = (data: unknown, opts: { merge: boolean }) => Promise<void>;
type DocGetFn = () => Promise<{ data: () => unknown }>;
type MockDocRef = {
  set: ReturnType<typeof vi.fn<DocSetFn>>;
  get: ReturnType<typeof vi.fn<DocGetFn>>;
};

const makeDocRef = (): MockDocRef => ({
  set: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue({ data: () => undefined })
});

// Sync scope now comes entirely from the /categories response (not
// adzuna_jobs_cache), so every test needs a categories mock. This is the
// default gb set most tests sync against; us defaults to empty unless a
// test explicitly cares about it.
const GB_CATEGORIES_RESPONSE = [
  { tag: 'it-jobs', label: 'IT Jobs' },
  { tag: 'sales-jobs', label: 'Sales Jobs' }
];

let runIndustryTrendsSync: (months: number, now?: Date) => Promise<SyncSummary>;

describe('runIndustryTrendsSync', () => {
  let docRefs: Map<string, MockDocRef>;
  let runTransactionMock: ReturnType<
    typeof vi.fn<(cb: (tx: unknown) => Promise<void>) => Promise<void>>
  >;

  beforeEach(async () => {
    vi.clearAllMocks();
    if (!runIndustryTrendsSync) {
      ({ runIndustryTrendsSync } = await import('../industryTrendsSync'));
    }

    docRefs = new Map();
    runTransactionMock = vi.fn(async (callback: (tx: unknown) => Promise<void>) => {
      const tx = {
        get: vi.fn().mockResolvedValue({ data: () => undefined }),
        set: vi.fn((ref: MockDocRef, data: unknown) => ref.set(data, { merge: true }))
      };
      await callback(tx);
    });

    const cacheDocs = [
      { categoryTag: 'it-jobs', searchParams: { country: 'gb' } },
      { categoryTag: 'it-jobs', searchParams: { country: 'gb' } },
      { categoryTag: 'it-jobs', searchParams: { country: 'gb' } },
      { categoryTag: 'sales-jobs', searchParams: { country: 'gb' } }
    ];

    useAdminFirestoreMock.mockReturnValue({
      collection: vi.fn((name: string) => {
        if (name === 'adzuna_jobs_cache') {
          return {
            select: vi.fn(() => ({ get: vi.fn().mockResolvedValue(makeSnapshot(cacheDocs)) }))
          };
        }
        if (name === 'adzuna_industry_trends') {
          return {
            doc: vi.fn((id: string) => {
              if (!docRefs.has(id)) {
                docRefs.set(id, makeDocRef());
              }
              return docRefs.get(id)!;
            })
          };
        }
        throw new Error(`unexpected collection: ${name}`);
      }),
      runTransaction: (cb: (tx: unknown) => Promise<void>) => runTransactionMock(cb)
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws a 500 when Adzuna credentials are missing', async () => {
    mockConfig.adzunaAppId = '';
    await expect(runIndustryTrendsSync(12)).rejects.toThrow(
      'Market data service is misconfigured.'
    );
    mockConfig.adzunaAppId = 'test-id';
  });

  it('backfill (months >= 12): writes lookupCount computed from adzuna_jobs_cache onto each doc', async () => {
    $fetchMock.mockImplementation((url: string) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      return Promise.resolve({ month: { '2026-01': 50000 } });
    });

    const summary = await runIndustryTrendsSync(12);

    expect(summary).toEqual({
      success: true,
      months: 12,
      synced: 2,
      failed: 0,
      results: expect.arrayContaining([
        {
          categoryTag: 'it-jobs',
          country: 'gb',
          status: 'ok',
          label: 'IT Jobs',
          latestMonth: '2026-01',
          latestAverage: 50000
        },
        {
          categoryTag: 'sales-jobs',
          country: 'gb',
          status: 'ok',
          label: 'Sales Jobs',
          latestMonth: '2026-01',
          latestAverage: 50000
        }
      ])
    });

    expect(docRefs.get('gb_it-jobs')?.set).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'IT Jobs', lookupCount: 3 }),
      { merge: true }
    );
    expect(docRefs.get('gb_sales-jobs')?.set).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Sales Jobs', lookupCount: 1 }),
      { merge: true }
    );
  });

  it('monthly delta (months < 12): merges into existing history via a transaction and still stores lookupCount', async () => {
    $fetchMock.mockImplementation((url: string) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      return Promise.resolve({ month: { '2026-02': 51000 } });
    });

    await runIndustryTrendsSync(1);

    expect(runTransactionMock).toHaveBeenCalled();
    expect(docRefs.get('gb_it-jobs')?.set).toHaveBeenCalledWith(
      expect.objectContaining({
        history: [{ month: '2026-02', average: 51000 }],
        lookupCount: 3
      }),
      { merge: true }
    );
  });

  it('skips the Adzuna call for a monthly delta when the stored doc already has the most recent complete month', async () => {
    const now = new Date(Date.UTC(2026, 9, 2)); // Oct 2, 2026 -> expected month '2026-09'
    docRefs.set('gb_it-jobs', {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi
        .fn()
        .mockResolvedValue({ data: () => ({ history: [{ month: '2026-09', average: 50000 }] }) })
    });

    let itJobsHistoryCalls = 0;
    $fetchMock.mockImplementation((url: string, opts?: { params?: { category?: string } }) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      if (opts?.params?.category === 'it-jobs') {
        itJobsHistoryCalls += 1;
      }
      return Promise.resolve({ month: { '2026-09': 99999 } });
    });

    const summary = await runIndustryTrendsSync(1, now);

    expect(itJobsHistoryCalls).toBe(0);
    expect(summary.results.find((r) => r.categoryTag === 'it-jobs')).toEqual({
      categoryTag: 'it-jobs',
      country: 'gb',
      status: 'ok',
      label: 'IT Jobs',
      skipped: true
    });
    expect(docRefs.get('gb_it-jobs')?.set).toHaveBeenCalledWith(
      { lookupCount: 3, updatedAt: 'server-timestamp' },
      { merge: true }
    );
    expect(docRefs.get('gb_sales-jobs')?.set).toHaveBeenCalled();
  });

  it('does not skip a monthly delta when the stored doc is missing the most recent complete month', async () => {
    const now = new Date(Date.UTC(2026, 9, 2)); // Oct 2, 2026 -> expected month '2026-09'
    docRefs.set('gb_it-jobs', {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi
        .fn()
        .mockResolvedValue({ data: () => ({ history: [{ month: '2026-08', average: 48000 }] }) })
    });
    $fetchMock.mockImplementation((url: string) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      return Promise.resolve({ month: { '2026-09': 52000 } });
    });

    await runIndustryTrendsSync(1, now);

    expect(runTransactionMock).toHaveBeenCalled();
    expect(docRefs.get('gb_it-jobs')?.set).toHaveBeenCalledWith(
      expect.objectContaining({ history: [{ month: '2026-09', average: 52000 }] }),
      { merge: true }
    );
  });

  it('does not skip a 12-month backfill even when the doc already has the most recent complete month', async () => {
    const now = new Date(Date.UTC(2026, 9, 2)); // Oct 2, 2026 -> expected month '2026-09'
    docRefs.set('gb_it-jobs', {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi
        .fn()
        .mockResolvedValue({ data: () => ({ history: [{ month: '2026-09', average: 50000 }] }) })
    });

    let itJobsHistoryCalls = 0;
    $fetchMock.mockImplementation((url: string, opts?: { params?: { category?: string } }) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      if (opts?.params?.category === 'it-jobs') {
        itJobsHistoryCalls += 1;
      }
      return Promise.resolve({ month: { '2026-09': 55000 } });
    });

    const summary = await runIndustryTrendsSync(12, now);

    expect(itJobsHistoryCalls).toBe(1);
    const itJobsResult = summary.results.find((r) => r.categoryTag === 'it-jobs');
    expect(itJobsResult?.skipped).toBeUndefined();
    expect(itJobsResult?.status).toBe('ok');
  });

  it('retries once after a 429 and succeeds, still storing lookupCount', async () => {
    let historyCalls = 0;
    $fetchMock.mockImplementation((url: string) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      historyCalls += 1;
      if (historyCalls === 1) {
        return Promise.reject({ statusCode: 429 });
      }
      return Promise.resolve({ month: { '2026-01': 45000 } });
    });

    vi.useFakeTimers();
    const promise = runIndustryTrendsSync(12);
    await vi.advanceTimersByTimeAsync(10_000);
    const summary = await promise;
    vi.useRealTimers();

    expect(summary.failed).toBe(0);
    expect(docRefs.get('gb_it-jobs')?.set).toHaveBeenCalledWith(
      expect.objectContaining({ lookupCount: 3 }),
      { merge: true }
    );
  });

  it('retries after a 503 (Service Temporarily Unavailable) the same as a 429, and succeeds', async () => {
    let historyCalls = 0;
    $fetchMock.mockImplementation((url: string) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      historyCalls += 1;
      if (historyCalls === 1) {
        return Promise.reject({ statusCode: 503 });
      }
      return Promise.resolve({ month: { '2026-01': 45000 } });
    });

    vi.useFakeTimers();
    const promise = runIndustryTrendsSync(12);
    await vi.advanceTimersByTimeAsync(10_000);
    const summary = await promise;
    vi.useRealTimers();

    expect(summary.failed).toBe(0);
  });

  it('retries a second time after a full rate-limit window when the first 10s retry also fails, and succeeds', async () => {
    let itJobsCalls = 0;
    $fetchMock.mockImplementation((url: string, opts?: { params?: { category?: string } }) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      if (opts?.params?.category !== 'it-jobs') {
        return Promise.resolve({ month: { '2026-01': 40000 } });
      }
      itJobsCalls += 1;
      if (itJobsCalls === 1) {
        return Promise.reject({ statusCode: 429 });
      }
      if (itJobsCalls === 2) {
        return Promise.reject({ statusCode: 503 });
      }
      return Promise.resolve({ month: { '2026-01': 45000 } });
    });

    vi.useFakeTimers();
    const promise = runIndustryTrendsSync(12);
    await vi.advanceTimersByTimeAsync(10_000 + 60_000);
    const summary = await promise;
    vi.useRealTimers();

    expect(itJobsCalls).toBe(3);
    expect(summary.failed).toBe(0);
  });

  it('gives up and reports an error after the final retry is also rate-limited', async () => {
    $fetchMock.mockImplementation((url: string) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      return Promise.reject({ statusCode: 429 });
    });

    vi.useFakeTimers();
    const promise = runIndustryTrendsSync(12);
    await vi.advanceTimersByTimeAsync(10_000 + 60_000);
    const summary = await promise;
    vi.useRealTimers();

    expect(summary.failed).toBe(2);
  });

  it('redacts app_id/app_key from a stored error message instead of leaking live credentials', async () => {
    $fetchMock.mockImplementation((url: string, opts?: { params?: { category?: string } }) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      if (opts?.params?.category === 'it-jobs') {
        return Promise.reject(
          new Error(
            '[GET] "https://api.adzuna.com/v1/api/jobs/gb/history?app_id=real-app-id&app_key=real-app-key&category=it-jobs&months=12&content-type=application%2Fjson": 500 Internal Server Error'
          )
        );
      }
      return Promise.resolve({ month: { '2026-01': 40000 } });
    });

    const summary = await runIndustryTrendsSync(12);

    const failure = summary.results.find((r) => r.categoryTag === 'it-jobs');
    expect(failure?.error).not.toContain('real-app-id');
    expect(failure?.error).not.toContain('real-app-key');
    expect(failure?.error).toContain('app_id=REDACTED');
    expect(failure?.error).toContain('app_key=REDACTED');
  });

  it('does not write a doc when Adzuna returns no history months for a category', async () => {
    $fetchMock.mockImplementation((url: string, opts?: { params?: { category?: string } }) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      if (opts?.params?.category === 'it-jobs') {
        return Promise.resolve({ month: {} });
      }
      return Promise.resolve({ month: { '2026-01': 40000 } });
    });

    const summary = await runIndustryTrendsSync(12);

    expect(summary.synced).toBe(2);
    expect(summary.failed).toBe(0);
    expect(docRefs.get('gb_it-jobs')?.set).not.toHaveBeenCalled();
    expect(docRefs.get('gb_sales-jobs')?.set).toHaveBeenCalled();
  });

  it('records a per-pair error and keeps syncing the rest when a history fetch fails', async () => {
    $fetchMock.mockImplementation((url: string, opts?: { params?: { category?: string } }) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      if (opts?.params?.category === 'it-jobs') {
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve({ month: { '2026-01': 40000 } });
    });

    const summary = await runIndustryTrendsSync(12);

    expect(summary.synced).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.results).toContainEqual({
      categoryTag: 'it-jobs',
      country: 'gb',
      status: 'error',
      error: 'boom',
      label: 'IT Jobs'
    });
  });

  it('falls back to the tag as label when a categories entry has no label', async () => {
    // An entry missing `tag` entirely contributes no pair to sync (there's
    // nothing to call /history with) -- that's a separate, unsynced case,
    // not a label-fallback case. This tests the fallback for entries that
    // do have a tag but no label.
    $fetchMock.mockImplementation((url: string) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: [{ tag: 'it-jobs' }, { tag: 'sales-jobs' }] });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      return Promise.resolve({ month: { '2026-01': 40000 } });
    });

    await runIndustryTrendsSync(12);

    expect(docRefs.get('gb_it-jobs')?.set).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'it-jobs' }),
      { merge: true }
    );
    expect(docRefs.get('gb_sales-jobs')?.set).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'sales-jobs' }),
      { merge: true }
    );
  });

  it('treats a history response with no month field as having zero history points', async () => {
    $fetchMock.mockImplementation((url: string, opts?: { params?: { category?: string } }) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      if (opts?.params?.category === 'it-jobs') {
        return Promise.resolve({});
      }
      return Promise.resolve({ month: { '2026-01': 40000 } });
    });

    const summary = await runIndustryTrendsSync(12);

    expect(summary.synced).toBe(2);
    expect(docRefs.get('gb_it-jobs')?.set).not.toHaveBeenCalled();
  });

  it('de-duplicates merged history by month, keeping the freshest average for the current period', async () => {
    runTransactionMock.mockImplementationOnce(async (callback: (tx: unknown) => Promise<void>) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          data: () => ({
            history: [
              { month: '2026-01', average: 40000 },
              { month: '2026-02', average: 41000 }
            ]
          })
        }),
        set: vi.fn((ref: MockDocRef, data: unknown) => ref.set(data, { merge: true }))
      };
      await callback(tx);
    });
    $fetchMock.mockImplementation((url: string, opts?: { params?: { category?: string } }) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      if (opts?.params?.category === 'it-jobs') {
        return Promise.resolve({ month: { '2026-02': 52000 } });
      }
      return Promise.resolve({ month: {} });
    });

    await runIndustryTrendsSync(1);

    expect(docRefs.get('gb_it-jobs')?.set).toHaveBeenCalledWith(
      expect.objectContaining({
        history: [
          { month: '2026-01', average: 40000 },
          { month: '2026-02', average: 52000 }
        ]
      }),
      { merge: true }
    );
  });

  it('records "Unknown error" when a history fetch rejects with a non-Error value', async () => {
    $fetchMock.mockImplementation((url: string, opts?: { params?: { category?: string } }) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      if (opts?.params?.category === 'it-jobs') {
        return Promise.reject('rate limit exceeded');
      }
      return Promise.resolve({ month: { '2026-01': 40000 } });
    });

    const summary = await runIndustryTrendsSync(12);

    expect(summary.results).toContainEqual(
      expect.objectContaining({ categoryTag: 'it-jobs', status: 'error', error: 'Unknown error' })
    );
  });

  it('paces requests into multiple batches when more pairs exist than the per-minute rate limit', async () => {
    const manyCategories = Array.from({ length: 21 }, (_, i) => ({
      tag: `cat-${i}`,
      label: `Cat ${i}`
    }));
    $fetchMock.mockImplementation((url: string) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: manyCategories });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      return Promise.resolve({ month: { '2026-01': 40000 } });
    });

    vi.useFakeTimers();
    const promise = runIndustryTrendsSync(12);
    await vi.advanceTimersByTimeAsync(60_000);
    const summary = await promise;
    vi.useRealTimers();

    expect(summary.results).toHaveLength(21);
    expect(summary.failed).toBe(0);
  });

  it('invalidates the industry-trends cache for both countries after a sync run', async () => {
    $fetchMock.mockImplementation((url: string) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      return Promise.resolve({ month: { '2026-01': 40000 } });
    });

    await runIndustryTrendsSync(12);

    expect(removeItemMock).toHaveBeenCalledWith(
      '/cache:nitro/functions:industryTrendsFetch:gb.json'
    );
    expect(removeItemMock).toHaveBeenCalledWith(
      '/cache:nitro/functions:industryTrendsFetch:us.json'
    );
  });

  it('does not fail the sync when cache invalidation itself errors', async () => {
    removeItemMock.mockRejectedValueOnce(new Error('storage unavailable'));
    $fetchMock.mockImplementation((url: string) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: GB_CATEGORIES_RESPONSE });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      return Promise.resolve({ month: { '2026-01': 40000 } });
    });

    const summary = await runIndustryTrendsSync(12);

    expect(summary.failed).toBe(0);
    expect(summary.synced).toBe(2);
  });

  it('syncs a category with zero adzuna_jobs_cache docs, driven entirely by the /categories response', async () => {
    // beforeEach's default adzuna_jobs_cache mock has no entries at all for
    // this tag -- this is the regression test for the production bug: a
    // category must sync even with zero recent search traffic.
    $fetchMock.mockImplementation((url: string) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({
          results: [{ tag: 'engineering-jobs', label: 'Engineering Jobs' }]
        });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [] });
      }
      return Promise.resolve({ month: { '2026-01': 60000 } });
    });

    const summary = await runIndustryTrendsSync(12);

    expect(summary.synced).toBe(1);
    expect(docRefs.get('gb_engineering-jobs')?.set).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Engineering Jobs', lookupCount: 0 }),
      { merge: true }
    );
  });

  it('attempts both tracked countries every run, independent of adzuna_jobs_cache contents', async () => {
    // beforeEach's default adzuna_jobs_cache mock only contains gb docs.
    $fetchMock.mockImplementation((url: string) => {
      if (url.includes('/gb/categories')) {
        return Promise.resolve({ results: [{ tag: 'it-jobs', label: 'IT Jobs' }] });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [{ tag: 'sales-jobs', label: 'Sales Jobs' }] });
      }
      return Promise.resolve({ month: { '2026-01': 70000 } });
    });

    const summary = await runIndustryTrendsSync(12);

    expect(summary.synced).toBe(2);
    expect(docRefs.get('gb_it-jobs')?.set).toHaveBeenCalled();
    expect(docRefs.get('us_sales-jobs')?.set).toHaveBeenCalled();
  });

  it('records an explicit failure when a country categories fetch fails, without blocking the other tracked country', async () => {
    $fetchMock.mockImplementation((url: string) => {
      if (url.includes('/gb/categories')) {
        return Promise.reject({ statusCode: 500 });
      }
      if (url.includes('/us/categories')) {
        return Promise.resolve({ results: [{ tag: 'sales-jobs', label: 'Sales Jobs' }] });
      }
      return Promise.resolve({ month: { '2026-01': 55000 } });
    });

    const summary = await runIndustryTrendsSync(12);

    expect(summary.results).toContainEqual(
      expect.objectContaining({ categoryTag: 'categories-fetch', country: 'gb', status: 'error' })
    );
    expect(docRefs.get('us_sales-jobs')?.set).toHaveBeenCalled();
    expect(summary.synced).toBe(1);
    expect(summary.failed).toBe(1);
  });
});
