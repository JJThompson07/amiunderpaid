import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import type { ReExpireCategoryCacheParams, ReExpireCategoryCacheSummary } from '../cacheReExpiry';

type ReExpireFn = (
  db: Firestore,
  params: ReExpireCategoryCacheParams
) => Promise<ReExpireCategoryCacheSummary>;

type DocData = Record<string, unknown>;
type MockDoc = { ref: string; data: () => DocData };
type Snapshot = { empty: boolean; size: number; docs: MockDoc[] };

const makeSnapshot = (docs: MockDoc[]): Snapshot => ({
  empty: docs.length === 0,
  size: docs.length,
  docs
});

const makeDoc = (id: string, data: DocData = {}): MockDoc => ({ ref: id, data: () => data });

// A single mock Query chain: where/orderBy/limit/startAfter all return
// itself, and .get() drains the next queued snapshot for this collection --
// mirroring the queue pattern in server/utils/tests/cachePurge.spec.ts,
// simplified to one queue per collection since reExpireAllMatching only
// issues one query shape (categoryTag + country) per collection.
const makeQuery = (queue: Snapshot[]): Record<string, ReturnType<typeof vi.fn>> => {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.where = vi.fn(() => query);
  query.orderBy = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.startAfter = vi.fn(() => query);
  query.get = vi.fn(() => Promise.resolve(queue.length > 0 ? queue.shift()! : makeSnapshot([])));
  return query;
};

let queues: Record<string, Snapshot[]>;
let mockBatchUpdate: ReturnType<typeof vi.fn>;
let mockBatchCommit: ReturnType<typeof vi.fn>;
let mockBatch: ReturnType<typeof vi.fn>;
let mockCollection: ReturnType<typeof vi.fn>;
let mockDb: Firestore;

const setQueue = (collection: string, snapshots: Snapshot[]): void => {
  queues[collection] = snapshots;
};

describe('reExpireCategoryCache', () => {
  let reExpireCategoryCache: ReExpireFn;

  beforeEach(async () => {
    vi.clearAllMocks();

    if (!reExpireCategoryCache) {
      ({ reExpireCategoryCache } = await import('../cacheReExpiry'));
    }

    queues = {
      adzuna_jobs_cache: [makeSnapshot([])],
      adzuna_distribution_cache: [makeSnapshot([])]
    };

    mockBatchUpdate = vi.fn();
    mockBatchCommit = vi.fn().mockResolvedValue(undefined);
    mockBatch = vi.fn(() => ({ update: mockBatchUpdate, commit: mockBatchCommit }));

    mockCollection = vi.fn((name: string) => ({
      where: vi.fn(() => makeQuery(queues[name] ?? []))
    }));

    mockDb = { collection: mockCollection, batch: mockBatch } as unknown as Firestore;
  });

  it('returns zero counts when no cached documents match the category/country', async () => {
    const result = await reExpireCategoryCache(mockDb, {
      categoryTag: 'it-jobs',
      countryCode: 'gb',
      cacheDays: 1
    });

    expect(result).toEqual({ updatedJobs: 0, updatedDistributions: 0 });
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('recomputes expiresAt on every matching document in both cache collections', async () => {
    setQueue('adzuna_jobs_cache', [makeSnapshot([makeDoc('job1'), makeDoc('job2')])]);
    setQueue('adzuna_distribution_cache', [makeSnapshot([makeDoc('dist1')])]);

    const now = new Date('2026-09-23T00:00:00.000Z');
    const result = await reExpireCategoryCache(mockDb, {
      categoryTag: 'it-jobs',
      countryCode: 'gb',
      cacheDays: 1,
      now
    });

    expect(result).toEqual({ updatedJobs: 2, updatedDistributions: 1 });
    expect(mockBatchUpdate).toHaveBeenCalledTimes(3);
    const expectedExpiresAt = new Date('2026-09-24T00:00:00.000Z');
    expect(mockBatchUpdate).toHaveBeenCalledWith('job1', { expiresAt: expectedExpiresAt });
    expect(mockBatchUpdate).toHaveBeenCalledWith('dist1', { expiresAt: expectedExpiresAt });
  });

  it('only touches documents matching the given category AND country (UK/USA independence)', async () => {
    // Both filters must chain onto the SAME query object -- the country
    // filter is a second .where() call off whatever the first .where()
    // returns, not a separate collection-level call. Asserting only the
    // collection-level call (the historical version of this test) would
    // miss a regression that silently drops the country filter.
    const query = makeQuery(queues.adzuna_jobs_cache!);
    const collectionWhereSpy = vi.fn(() => query);
    mockCollection.mockImplementation((name: string) => ({
      where:
        name === 'adzuna_jobs_cache'
          ? collectionWhereSpy
          : vi.fn(() => makeQuery(queues[name] ?? []))
    }));
    setQueue('adzuna_jobs_cache', [makeSnapshot([makeDoc('uk-job')])]);

    await reExpireCategoryCache(mockDb, {
      categoryTag: 'it-jobs',
      countryCode: 'gb',
      cacheDays: 1
    });

    expect(collectionWhereSpy).toHaveBeenCalledWith('categoryTag', '==', 'it-jobs');
    expect(query.where).toHaveBeenCalledWith('searchParams.country', '==', 'gb');
  });

  it('paginates across multiple batch commits when more than 500 documents match', async () => {
    const firstPage = makeSnapshot(Array.from({ length: 500 }, (_, i) => makeDoc(`job${i}`)));
    const secondPage = makeSnapshot([makeDoc('job-last')]);
    setQueue('adzuna_jobs_cache', [firstPage, secondPage]);

    const result = await reExpireCategoryCache(mockDb, {
      categoryTag: 'it-jobs',
      countryCode: 'us',
      cacheDays: 30
    });

    expect(result.updatedJobs).toBe(501);
    // One commit per page: the full 500-doc page, then the trailing 1-doc page.
    expect(mockBatchCommit).toHaveBeenCalledTimes(2);
  });

  it('propagates a Firestore batch commit failure without swallowing it', async () => {
    setQueue('adzuna_jobs_cache', [makeSnapshot([makeDoc('job1')])]);
    mockBatchCommit.mockRejectedValueOnce(new Error('firestore unavailable'));

    await expect(
      reExpireCategoryCache(mockDb, { categoryTag: 'it-jobs', countryCode: 'gb', cacheDays: 1 })
    ).rejects.toThrow('firestore unavailable');
  });
});
