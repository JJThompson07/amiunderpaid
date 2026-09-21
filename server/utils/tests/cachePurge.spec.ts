import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import type { PurgeOptions, PurgeSummary } from '../cachePurge';

type PurgeFn = (db?: Firestore, options?: PurgeOptions) => Promise<PurgeSummary>;

type DocData = Record<string, unknown>;
type MockDoc = { ref: string; data: () => DocData };
type Snapshot = { empty: boolean; size: number; docs: MockDoc[] };

const makeSnapshot = (docs: MockDoc[]): Snapshot => ({
  empty: docs.length === 0,
  size: docs.length,
  docs
});

const makeDoc = (id: string, data: DocData = {}): MockDoc => ({ ref: id, data: () => data });

type QueueRef = { queue: Snapshot[] };

// A single mock Query chain: `where`/`limit` both return itself, and
// `.get()` drains the next queued snapshot -- mirroring the queue pattern
// already used in server/api/admin/tests/clean-cache.spec.ts.
const makeQuery = (queueRef: QueueRef): Record<string, ReturnType<typeof vi.fn>> => {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.where = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.get = vi.fn(() =>
    Promise.resolve(queueRef.queue.length > 0 ? queueRef.queue.shift()! : makeSnapshot([]))
  );
  return query;
};

let queues: Record<string, QueueRef>;
let mockBatchDelete: ReturnType<typeof vi.fn>;
let mockBatchCommit: ReturnType<typeof vi.fn>;
let mockBatch: ReturnType<typeof vi.fn>;
let mockCollection: ReturnType<typeof vi.fn>;
let mockDb: Firestore;

const queueKey = (collection: string, field: string, op: string): string =>
  `${collection}:${field}:${op}`;

const setQueue = (collection: string, field: string, op: string, snapshots: Snapshot[]): void => {
  queues[queueKey(collection, field, op)] = { queue: snapshots };
};

const emptyAllQueues = (): void => {
  queues = {};
  for (const collection of ['adzuna_jobs_cache', 'adzuna_distribution_cache']) {
    setQueue(collection, 'expiresAt', '<', [makeSnapshot([])]);
    setQueue(collection, 'timestamp', '<', [makeSnapshot([])]);
  }
};

const useAdminFirestoreMock = vi.fn();

describe('purgeExpiredCache', () => {
  let purgeExpiredCache: PurgeFn;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('useAdminFirestore', useAdminFirestoreMock);

    if (!purgeExpiredCache) {
      ({ purgeExpiredCache } = await import('../cachePurge'));
    }

    emptyAllQueues();

    mockBatchDelete = vi.fn();
    mockBatchCommit = vi.fn().mockResolvedValue(undefined);
    mockBatch = vi.fn(() => ({ delete: mockBatchDelete, commit: mockBatchCommit }));

    mockCollection = vi.fn((name: string) => ({
      where: vi.fn((field: string, op: string) => {
        const ref = queues[queueKey(name, field, op)];
        if (!ref) {
          throw new Error(`Unexpected query: ${queueKey(name, field, op)}`);
        }
        return makeQuery(ref);
      })
    }));

    mockDb = { collection: mockCollection, batch: mockBatch } as unknown as Firestore;
    useAdminFirestoreMock.mockReturnValue(mockDb);
  });

  it('returns zero counts when every collection is empty', async () => {
    const result = await purgeExpiredCache(mockDb);

    expect(result).toEqual({ deletedJobs: 0, deletedDistributions: 0 });
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('deletes expired and legacy entries from both market-data cache collections', async () => {
    setQueue('adzuna_jobs_cache', 'expiresAt', '<', [
      makeSnapshot([makeDoc('job1'), makeDoc('job2')]),
      makeSnapshot([])
    ]);
    setQueue('adzuna_jobs_cache', 'timestamp', '<', [makeSnapshot([makeDoc('legacyJob1')])]);
    setQueue('adzuna_distribution_cache', 'expiresAt', '<', [makeSnapshot([makeDoc('dist1')])]);
    setQueue('adzuna_distribution_cache', 'timestamp', '<', [
      makeSnapshot([makeDoc('legacyDist1'), makeDoc('legacyDist2')])
    ]);

    const result = await purgeExpiredCache(mockDb);

    expect(result.deletedJobs).toBe(3);
    expect(result.deletedDistributions).toBe(3);
    expect(mockBatchDelete).toHaveBeenCalledTimes(6);
  });

  it('chunks deletion across multiple batch commits when a query keeps matching', async () => {
    const firstBatch = makeSnapshot(Array.from({ length: 3 }, (_, i) => makeDoc(`job${i}`)));
    const secondBatch = makeSnapshot([makeDoc('job-last')]);
    setQueue('adzuna_jobs_cache', 'expiresAt', '<', [firstBatch, secondBatch, makeSnapshot([])]);

    const result = await purgeExpiredCache(mockDb);

    expect(result.deletedJobs).toBe(4);
    // One commit per non-empty snapshot returned for this query.
    expect(mockBatchCommit).toHaveBeenCalledTimes(2);
  });

  it('propagates a Firestore batch commit failure without swallowing it', async () => {
    setQueue('adzuna_jobs_cache', 'expiresAt', '<', [makeSnapshot([makeDoc('job1')])]);
    mockBatchCommit.mockRejectedValueOnce(new Error('firestore unavailable'));

    await expect(purgeExpiredCache(mockDb)).rejects.toThrow('firestore unavailable');
  });

  it('propagates a query failure without swallowing it', async () => {
    const failingQuery = makeQuery({ queue: [] });
    failingQuery.get = vi.fn(() => Promise.reject(new Error('query failed')));
    mockCollection.mockImplementationOnce((name: string) => ({
      where: vi.fn((field: string, op: string) => {
        if (name === 'adzuna_jobs_cache' && field === 'expiresAt' && op === '<') {
          return failingQuery;
        }
        const ref = queues[queueKey(name, field, op)];
        return makeQuery(ref!);
      })
    }));

    await expect(purgeExpiredCache(mockDb)).rejects.toThrow('query failed');
  });

  it('defaults to useAdminFirestore() when no db is passed', async () => {
    const result = await purgeExpiredCache();

    expect(useAdminFirestoreMock).toHaveBeenCalled();
    expect(result).toEqual({ deletedJobs: 0, deletedDistributions: 0 });
  });

  it('honors an explicit options.now override for boundary calculations', async () => {
    const fixedNow = new Date('2026-01-01T00:00:00.000Z');
    let capturedExpiresAtBound: unknown;
    mockCollection.mockImplementation((name: string) => ({
      where: vi.fn((field: string, op: string, value: unknown) => {
        if (name === 'adzuna_jobs_cache' && field === 'expiresAt' && op === '<') {
          capturedExpiresAtBound = value;
        }
        const ref = queues[queueKey(name, field, op)];
        return makeQuery(ref!);
      })
    }));

    await purgeExpiredCache(mockDb, { now: fixedNow });

    expect(capturedExpiresAtBound).toEqual(fixedNow);
  });
});
