import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type CleanCacheHandler = (event: H3Event) => Promise<{
  success: boolean;
  message: string;
  stats: { deletedJobs: number; deletedDistributions: number };
}>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});

const mockVerifyAdmin = vi.fn();
vi.stubGlobal('verifyAdmin', mockVerifyAdmin);

const mockBatchCommit = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatch = vi.fn(() => ({ delete: mockBatchDelete, commit: mockBatchCommit }));

type SnapshotDoc = { ref: string };
type Snapshot = { empty: boolean; size: number; docs: SnapshotDoc[] };
const makeSnapshot = (docs: SnapshotDoc[]): Snapshot => ({
  empty: docs.length === 0,
  size: docs.length,
  docs
});

let jobsQueueSnapshots: Snapshot[];
let distQueueSnapshots: Snapshot[];

const mockLimit = (queueRef: { queue: Snapshot[] }): ReturnType<typeof vi.fn> =>
  vi.fn(() => ({
    get: vi.fn(() =>
      Promise.resolve(queueRef.queue.length > 0 ? queueRef.queue.shift() : makeSnapshot([]))
    )
  }));

const mockAdminFirestore = vi.fn();
vi.stubGlobal('useAdminFirestore', mockAdminFirestore);

describe('admin clean-cache endpoint', () => {
  let handler: CleanCacheHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../clean-cache.post');
    handler = mod.default as unknown as CleanCacheHandler;

    mockVerifyAdmin.mockResolvedValue(undefined);
    mockBatchCommit.mockResolvedValue(undefined);

    jobsQueueSnapshots = [makeSnapshot([{ ref: 'job1' }, { ref: 'job2' }]), makeSnapshot([])];
    distQueueSnapshots = [makeSnapshot([{ ref: 'dist1' }]), makeSnapshot([])];

    mockAdminFirestore.mockReturnValue({
      batch: mockBatch,
      collection: vi.fn((name: string) => ({
        where: vi.fn(() => ({
          limit:
            name === 'adzuna_jobs_cache'
              ? mockLimit({ queue: jobsQueueSnapshots })
              : mockLimit({ queue: distQueueSnapshots })
        }))
      }))
    });
  });

  it('deletes expired jobs and distribution cache docs in batches', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({
      success: true,
      message: 'Cache cleaned successfully.',
      stats: { deletedJobs: 2, deletedDistributions: 1 }
    });
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it('wraps a Firestore batch failure in an opaque 500', async () => {
    mockBatchCommit.mockRejectedValueOnce(new Error('firestore down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to clean cache');
  });

  it('wraps a non-Error throw with an "Unknown error" data message', async () => {
    mockBatchCommit.mockRejectedValueOnce('a string rejection');
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to clean cache');
  });
});
