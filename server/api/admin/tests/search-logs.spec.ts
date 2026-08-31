import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';
import { verifyAdmin } from '../../../utils/firebase';
import handler from '../search-logs.get';

type SearchLogsHandler = (event: H3Event) => Promise<{
  success: boolean;
  totalCount: number;
  todayCount: number;
  yesterdayCount: number;
  oldestDate: string;
  averagePerDay: number;
  logs: Record<string, unknown>[];
  nextCursor?: string;
}>;

let mockQuery: Record<string, string>;
vi.mock('h3', () => ({
  defineEventHandler: <T>(fn: T): T => fn,
  getQuery: (): Record<string, string> => mockQuery,
  createError: (err: Partial<H3Error>): Error => {
    const e = new Error(err.message) as Error & { statusCode?: number };
    e.statusCode = err.statusCode;
    return e;
  }
}));

let mockConfig: { algoliaApplicationId?: string; algoliaAdminApiKey?: string };
vi.stubGlobal('useRuntimeConfig', () => mockConfig);

vi.mock('../../../utils/firebase', () => ({
  verifyAdmin: vi.fn(),
  useAdminApp: vi.fn(),
  useAdminFirestore: vi.fn()
}));

type Snap = { empty: boolean; docs: { id?: string; data: () => unknown }[] };
let getQueue: (Snap | { data: () => { count: number } })[];
let docGetQueue: { exists: boolean }[];

const mockChain: {
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  startAfter: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  doc: ReturnType<typeof vi.fn>;
} = {
  where: vi.fn(() => mockChain),
  orderBy: vi.fn(() => mockChain),
  limit: vi.fn(() => mockChain),
  startAfter: vi.fn(() => mockChain),
  count: vi.fn(() => mockChain),
  get: vi.fn(() => Promise.resolve(getQueue.shift())),
  doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve(docGetQueue.shift())) }))
};

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: vi.fn(() => mockChain) }))
}));

const mockAlgoliaSearch = vi.fn();
const mockInitIndex = vi.fn(() => ({ search: mockAlgoliaSearch }));
vi.mock('algoliasearch', () => ({
  default: vi.fn(() => ({ initIndex: mockInitIndex }))
}));

const countSnap = (count: number): { data: () => { count: number } } => ({
  data: (): { count: number } => ({ count })
});

describe('Admin Search Logs Endpoint', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
    vi.mocked(verifyAdmin).mockResolvedValue(undefined);
    mockQuery = {};
    mockConfig = { algoliaApplicationId: 'app_id', algoliaAdminApiKey: 'admin_key' };
    getQueue = [];
    docGetQueue = [];
  });

  it('should enforce admin authorization via verifyAdmin', async (): Promise<void> => {
    const event = { context: {} } as unknown as H3Event;
    const error = new Error('Forbidden');
    vi.mocked(verifyAdmin).mockRejectedValueOnce(error);

    await expect((handler as SearchLogsHandler)(event)).rejects.toThrow('Forbidden');
    expect(verifyAdmin).toHaveBeenCalledWith(event);
  });

  it('lists logs via native pagination, mapping populated and sparse docs', async (): Promise<void> => {
    const oldestTimestamp = {
      toDate: (): Date => new Date('2024-01-01T00:00:00Z'),
      toMillis: (): number => new Date('2024-01-01T00:00:00Z').getTime()
    };
    getQueue = [
      countSnap(42),
      { empty: false, docs: [{ data: (): unknown => ({ timestamp: oldestTimestamp }) }] },
      countSnap(3),
      countSnap(5),
      {
        empty: false,
        docs: [
          {
            id: 'log1',
            data: (): unknown => ({
              title: 'Engineer',
              country: 'UK',
              location: 'London',
              salary: 50000,
              schedule: 'full-time',
              contract: 'permanent',
              brand: 'AmIUnderpaid',
              mcaScore: '72',
              marketAverage: 55000,
              governmentAverage: 48000,
              searchSuccess: true,
              historical_fetched_MCA: true,
              provider: 'adzuna',
              timestamp: { toDate: (): Date => new Date('2024-06-01T12:00:00Z') }
            })
          },
          { id: 'log2', data: (): unknown => ({}) }
        ]
      }
    ];

    const res = await (handler as SearchLogsHandler)({} as unknown as H3Event);

    expect(res.success).toBe(true);
    expect(res.totalCount).toBe(42);
    expect(res.todayCount).toBe(3);
    expect(res.yesterdayCount).toBe(5);
    expect(res.oldestDate).not.toBe('the beginning');
    expect(res.logs).toHaveLength(2);
    expect(res.logs[0]).toEqual(
      expect.objectContaining({ id: 'log1', title: 'Engineer', country: 'UK' })
    );
    expect(res.logs[1]).toEqual(
      expect.objectContaining({ id: 'log2', title: '', country: '', formattedDate: 'Unknown' })
    );
    expect(res.nextCursor).toBeUndefined();
  });

  it('sets nextCursor when a full page is returned, and follows an existing cursor with startAfter', async (): Promise<void> => {
    mockQuery = { cursor: 'log1', limit: '1' };
    getQueue = [
      countSnap(10),
      { empty: true, docs: [] },
      countSnap(0),
      countSnap(0),
      { empty: false, docs: [{ id: 'log2', data: (): unknown => ({}) }] }
    ];
    docGetQueue = [{ exists: true }];

    const res = await (handler as SearchLogsHandler)({} as unknown as H3Event);

    expect(res.oldestDate).toBe('the beginning');
    expect(mockChain.startAfter).toHaveBeenCalled();
    expect(res.nextCursor).toBe('log2');
  });

  it('ignores a cursor pointing at a non-existent document', async (): Promise<void> => {
    mockQuery = { cursor: 'missing' };
    getQueue = [
      countSnap(0),
      { empty: true, docs: [] },
      countSnap(0),
      countSnap(0),
      { empty: false, docs: [] }
    ];
    docGetQueue = [{ exists: false }];

    await (handler as SearchLogsHandler)({} as unknown as H3Event);

    expect(mockChain.startAfter).not.toHaveBeenCalled();
  });

  it('searches via Algolia when a search term is provided, using cursor as a page number', async (): Promise<void> => {
    mockQuery = { search: 'Engineer', cursor: '0' };
    getQueue = [countSnap(10), { empty: true, docs: [] }, countSnap(0), countSnap(0)];
    mockAlgoliaSearch.mockResolvedValue({
      hits: [{ objectID: 'obj1', title: 'Engineer', timestamp: 1700000000000 }],
      nbHits: 25,
      page: 0,
      nbPages: 2
    });

    const res = await (handler as SearchLogsHandler)({} as unknown as H3Event);

    expect(res.totalCount).toBe(25);
    expect(res.nextCursor).toBe('1');
    expect(res.logs[0]).toEqual(expect.objectContaining({ id: 'obj1', title: 'Engineer' }));
  });

  it('handles an Algolia hit with no timestamp', async (): Promise<void> => {
    mockQuery = { search: 'Engineer' };
    getQueue = [countSnap(1), { empty: true, docs: [] }, countSnap(0), countSnap(0)];
    mockAlgoliaSearch.mockResolvedValue({
      hits: [{ objectID: 'obj2', title: 'Engineer' }],
      nbHits: 1,
      page: 0,
      nbPages: 1
    });

    const res = await (handler as SearchLogsHandler)({} as unknown as H3Event);

    expect(res.nextCursor).toBeUndefined();
    expect(res.logs[0]).toEqual(expect.objectContaining({ id: 'obj2', formattedDate: 'Unknown' }));
  });

  it('throws a 500 when Algolia credentials are missing for a search request', async (): Promise<void> => {
    mockQuery = { search: 'Engineer' };
    mockConfig = {};
    getQueue = [countSnap(0), { empty: true, docs: [] }, countSnap(0), countSnap(0)];

    await expect((handler as SearchLogsHandler)({} as unknown as H3Event)).rejects.toThrow(
      'Algolia credentials missing for search'
    );
  });

  it('wraps an unexpected failure in a 500 with the underlying message', async (): Promise<void> => {
    mockChain.get.mockRejectedValueOnce(new Error('firestore down'));

    await expect((handler as SearchLogsHandler)({} as unknown as H3Event)).rejects.toThrow(
      'firestore down'
    );
  });
});
