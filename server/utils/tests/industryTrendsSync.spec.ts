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

const makeSnapshot = (docs: unknown[]): { docs: { data: () => unknown }[] } => ({
  docs: docs.map((data) => ({ data: () => data }))
});

type DocSetFn = (data: unknown, opts: { merge: boolean }) => Promise<void>;
type MockDocRef = { set: ReturnType<typeof vi.fn<DocSetFn>> };

let runIndustryTrendsSync: (months: number) => Promise<SyncSummary>;

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
                docRefs.set(id, { set: vi.fn().mockResolvedValue(undefined) });
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
      if (url.includes('/categories')) {
        return Promise.resolve({
          results: [
            { tag: 'it-jobs', label: 'IT Jobs' },
            { tag: 'sales-jobs', label: 'Sales Jobs' }
          ]
        });
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
      if (url.includes('/categories')) {
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

  it('retries once after a 429 and succeeds, still storing lookupCount', async () => {
    let historyCalls = 0;
    $fetchMock.mockImplementation((url: string) => {
      if (url.includes('/categories')) {
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

  it('does not write a doc when Adzuna returns no history months for a category', async () => {
    $fetchMock.mockImplementation((url: string, opts?: { params?: { category?: string } }) => {
      if (url.includes('/categories')) {
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
    expect(docRefs.has('gb_it-jobs')).toBe(false);
    expect(docRefs.get('gb_sales-jobs')?.set).toHaveBeenCalled();
  });

  it('records a per-pair error and keeps syncing the rest when a history fetch fails', async () => {
    $fetchMock.mockImplementation((url: string, opts?: { params?: { category?: string } }) => {
      if (url.includes('/categories')) {
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
      label: 'it-jobs'
    });
  });
});
