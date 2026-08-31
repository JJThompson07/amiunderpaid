import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type BackfillHandler = (event: H3Event) => Promise<{
  success: boolean;
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
  skipReasons: { alreadyBackfilled: number; hasMcaScore: number; missingTitle: number };
  failReasons: string[];
}>;

type Snap = { empty: boolean; docs: { id?: string; data: () => unknown }[] };
const emptySnap: Snap = { empty: true, docs: [] };

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => new Error(err.message));
vi.stubGlobal('getRequestHeader', () => mockAuthHeader);

let mockAuthHeader: string | undefined;
const mockVerifyIdToken = vi.fn();
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({ verifyIdToken: mockVerifyIdToken }))
}));

vi.mock('../../../utils/adzuna', () => ({
  generateCacheKey: vi.fn(() => 'cache-key')
}));

const mockCalculateUK = vi.fn();
const mockCalculateUSA = vi.fn();
vi.mock('~~/shared/utils/uk', () => ({ calculateUKBenchmarkScore: mockCalculateUK }));
vi.mock('~~/shared/utils/usa', () => ({ calculateUSABenchmarkScore: mockCalculateUSA }));

let queryQueues: Record<string, Snap[]>;
let docGetQueues: Record<string, { exists: boolean; data: () => unknown }[]>;
const searchHistorySetSpy = vi.fn().mockResolvedValue(undefined);

const makeChain = (name: string): unknown => {
  const chain = {
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    get: vi.fn(() =>
      Promise.resolve(queryQueues[name]?.length ? queryQueues[name].shift() : emptySnap)
    ),
    doc: vi.fn(() => ({
      get: vi.fn(() =>
        Promise.resolve(
          docGetQueues[name]?.length
            ? docGetQueues[name].shift()
            : { exists: false, data: (): unknown => undefined }
        )
      ),
      set: name === 'search_history' ? searchHistorySetSpy : vi.fn().mockResolvedValue(undefined)
    }))
  };
  return chain;
};

const mockCollection = vi.fn((name: string) => makeChain(name));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection }))
}));

describe('admin backfill-searches endpoint', () => {
  let handler: BackfillHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../backfill-searches.post');
    handler = mod.default as unknown as BackfillHandler;

    mockAuthHeader = 'Bearer valid-token';
    mockVerifyIdToken.mockResolvedValue({ uid: 'admin_1' });
    queryQueues = {};
    docGetQueues = {};
    searchHistorySetSpy.mockClear();
  });

  it('rejects without a Bearer token', async () => {
    mockAuthHeader = undefined;
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow();
  });

  it('backfills a UK doc missing MCA data and marks it updated', async () => {
    queryQueues.search_history = [
      {
        empty: false,
        docs: [
          {
            id: 'doc1',
            data: (): unknown => ({
              title: 'Software Engineer',
              country: 'UK',
              location: 'london',
              salary: 50000,
              schedule: 'full-time',
              contract: 'permanent',
              historical_fetched_MCA: false,
              historical_fetched_MCA_v2: false,
              mcaScore: null,
              governmentAverage: null
            })
          }
        ]
      }
    ];
    docGetQueues.adzuna_distribution_cache = [{ exists: false, data: (): unknown => undefined }];
    docGetQueues.adzuna_jobs_cache = [
      {
        exists: true,
        data: (): unknown => ({
          data: { results: [{ salary_max: 60000 }, { salary_max: 80000 }], count: 5 },
          gov_id_code: '2136'
        })
      }
    ];
    queryQueues.salary_benchmarks = [
      {
        empty: false,
        docs: [
          {
            data: (): unknown => ({
              avg_salary: 55000,
              salary: 52000,
              salary_10_pt: 40000,
              salary_25_pt: 45000,
              salary_75_pt: 65000,
              salary_90_pt: 75000,
              title: 'Software Developer'
            })
          }
        ]
      },
      {
        empty: false,
        docs: [
          {
            data: (): unknown => ({
              avg_salary: 48000,
              salary: 45000,
              salary_10_pt: 30000,
              salary_25_pt: 35000,
              salary_75_pt: 55000,
              salary_90_pt: 65000
            })
          }
        ]
      }
    ];
    mockCalculateUK.mockReturnValue({
      score: 72,
      breakdown: { microPercentile: 60, macroPercentile: 55, livePercentile: 70 }
    });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.updated).toBe(1);
    expect(res.failed).toBe(0);
    expect(mockCalculateUK).toHaveBeenCalled();
    expect(searchHistorySetSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        historical_fetched_MCA: true,
        historical_fetched_MCA_v2: true,
        mcaScore: 72,
        governmentAverage: 55000
      }),
      { merge: true }
    );
  });

  it('skips a doc already successfully backfilled', async () => {
    queryQueues.search_history = [
      {
        empty: false,
        docs: [
          {
            id: 'doc2',
            data: (): unknown => ({
              title: 'Engineer',
              country: 'UK',
              historical_fetched_MCA: true,
              historical_fetched_MCA_v2: false,
              marketAverage: 40000,
              mcaScore: null,
              governmentAverage: null
            })
          }
        ]
      }
    ];

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.skipped).toBe(1);
    expect(res.skipReasons.alreadyBackfilled).toBe(1);
    expect(searchHistorySetSpy).not.toHaveBeenCalled();
  });

  it('skips a doc that already has an mcaScore', async () => {
    queryQueues.search_history = [
      {
        empty: false,
        docs: [
          {
            id: 'doc3',
            data: (): unknown => ({
              title: 'Engineer',
              country: 'UK',
              historical_fetched_MCA_v2: false,
              mcaScore: 55,
              governmentAverage: null
            })
          }
        ]
      }
    ];

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.skipped).toBe(1);
    expect(res.skipReasons.hasMcaScore).toBe(1);
  });

  it('skips a doc with a missing title', async () => {
    queryQueues.search_history = [
      {
        empty: false,
        docs: [
          {
            id: 'doc4',
            data: (): unknown => ({
              title: '',
              country: 'UK',
              historical_fetched_MCA_v2: false,
              mcaScore: null,
              governmentAverage: null
            })
          }
        ]
      }
    ];

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.skipped).toBe(1);
    expect(res.skipReasons.missingTitle).toBe(1);
  });

  it('counts a per-doc failure and continues without throwing', async () => {
    queryQueues.search_history = [
      {
        empty: false,
        docs: [
          {
            id: 'doc5',
            data: (): unknown => ({
              title: 'Engineer',
              country: 'UK',
              historical_fetched_MCA_v2: false,
              mcaScore: null,
              governmentAverage: null
            })
          }
        ]
      }
    ];
    docGetQueues.adzuna_distribution_cache = [
      {
        exists: true,
        data: (): never => {
          throw new Error('corrupt cache doc');
        }
      }
    ];

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.failed).toBe(1);
    expect(res.failReasons).toContain('corrupt cache doc');
  });

  it('backfills a USA doc via direct title match and macro benchmark, clearing a country-alias location', async () => {
    queryQueues.search_history = [
      {
        empty: false,
        docs: [
          {
            id: 'doc6',
            data: (): unknown => ({
              title: 'Software Engineer',
              country: 'USA',
              location: 'usa',
              salary: 90000,
              schedule: 'part-time',
              contract: 'contract',
              historical_fetched_MCA_v2: false,
              mcaScore: null,
              governmentAverage: null
            })
          }
        ]
      }
    ];
    docGetQueues.adzuna_distribution_cache = [{ exists: false, data: (): unknown => undefined }];
    docGetQueues.adzuna_jobs_cache = [
      {
        exists: true,
        data: (): unknown => ({
          data: { results: [{ salary_max: 100000 }], count: 3 },
          gov_id_code: null
        })
      }
    ];
    queryQueues.salary_benchmarks = [
      {
        empty: false,
        docs: [
          {
            data: (): unknown => ({
              avg_salary: 95000,
              salary: 92000,
              salary_10_pt: 70000,
              salary_25_pt: 80000,
              salary_75_pt: 105000,
              salary_90_pt: 115000,
              title: 'Software Engineer II'
            })
          }
        ]
      },
      {
        empty: false,
        docs: [
          {
            data: (): unknown => ({
              avg_salary: 88000,
              salary: 85000,
              salary_10_pt: 60000,
              salary_25_pt: 70000,
              salary_75_pt: 95000,
              salary_90_pt: 105000
            })
          }
        ]
      }
    ];
    mockCalculateUSA.mockReturnValue({
      score: 68,
      breakdown: { microPercentile: 50, macroPercentile: 45, livePercentile: 65 }
    });

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.updated).toBe(1);
    expect(res.failed).toBe(0);
    expect(mockCalculateUSA).toHaveBeenCalled();
    expect(searchHistorySetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ mcaScore: 68, searchSuccess: true }),
      { merge: true }
    );
  });

  it('leaves mcaScore null and omits searchSuccess when no macro/micro/live data is found', async () => {
    queryQueues.search_history = [
      {
        empty: false,
        docs: [
          {
            id: 'doc7',
            data: (): unknown => ({
              title: 'Rare Job Title',
              country: 'UK',
              salary: 0,
              historical_fetched_MCA_v2: false,
              mcaScore: null,
              governmentAverage: null
            })
          }
        ]
      }
    ];
    docGetQueues.adzuna_distribution_cache = [{ exists: false, data: (): unknown => undefined }];
    docGetQueues.adzuna_jobs_cache = [{ exists: false, data: (): unknown => undefined }];

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.updated).toBe(1);
    expect(searchHistorySetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ mcaScore: null, marketAverage: null, governmentAverage: null }),
      { merge: true }
    );
    const payload = searchHistorySetSpy.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.searchSuccess).toBeUndefined();
  });

  it('stops scanning once 50 docs needing backfill are found', async () => {
    const makeDoc = (id: string): { id: string; data: () => unknown } => ({
      id,
      data: (): unknown => ({
        title: 'Engineer',
        country: 'UK',
        historical_fetched_MCA_v2: false,
        mcaScore: null,
        governmentAverage: null
      })
    });
    queryQueues.search_history = [
      {
        empty: false,
        docs: Array.from({ length: 51 }, (_, i) => makeDoc(`doc-${i}`))
      }
    ];

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.processed).toBe(50);
  });

  it('resolves a UK micro benchmark via job_titles SOC lookup when no gov_id_code is cached', async () => {
    queryQueues.search_history = [
      {
        empty: false,
        docs: [
          {
            id: 'doc8',
            data: (): unknown => ({
              title: 'Software Engineer',
              country: 'UK',
              location: 'london',
              salary: 50000,
              historical_fetched_MCA_v2: false,
              mcaScore: null,
              governmentAverage: null
            })
          }
        ]
      }
    ];
    docGetQueues.adzuna_distribution_cache = [{ exists: false, data: (): unknown => undefined }];
    docGetQueues.adzuna_jobs_cache = [
      {
        exists: true,
        data: (): unknown => ({
          data: { results: [{ salary_max: 60000 }], count: 2 },
          gov_id_code: null
        })
      }
    ];
    queryQueues.job_titles = [{ empty: false, docs: [{ data: (): unknown => ({ soc: '2136' }) }] }];
    queryQueues.salary_benchmarks = [
      {
        empty: false,
        docs: [
          {
            data: (): unknown => ({ avg_salary: 55000, salary: 52000, title: 'Software Developer' })
          }
        ]
      },
      { empty: true, docs: [] }
    ];

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.updated).toBe(1);
    expect(searchHistorySetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ governmentAverage: 55000 }),
      { merge: true }
    );
  });

  it('excludes docs that already have both an mcaScore and a governmentAverage from the scan', async () => {
    queryQueues.search_history = [
      {
        empty: false,
        docs: [
          {
            id: 'doc-excluded',
            data: (): unknown => ({
              title: 'Already Done',
              country: 'UK',
              historical_fetched_MCA_v2: false,
              mcaScore: 80,
              governmentAverage: 50000
            })
          }
        ]
      }
    ];

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.processed).toBe(0);
  });

  it('falls back to defaults when country/cache fields are missing, using sparse UK micro & macro benchmark data', async () => {
    queryQueues.search_history = [
      {
        empty: false,
        docs: [
          {
            id: 'doc-sparse',
            data: (): unknown => ({
              title: 'Sparse Role',
              salary: 40000,
              historical_fetched_MCA_v2: false,
              mcaScore: null,
              governmentAverage: null
            })
          }
        ]
      }
    ];
    docGetQueues.adzuna_distribution_cache = [{ exists: true, data: (): unknown => ({}) }];
    docGetQueues.adzuna_jobs_cache = [{ exists: true, data: (): unknown => ({}) }];
    queryQueues.job_titles = [{ empty: false, docs: [{ data: (): unknown => ({ soc: '2136' }) }] }];
    queryQueues.salary_benchmarks = [
      { empty: false, docs: [{ data: (): unknown => ({ salary: 30000 }) }] },
      { empty: false, docs: [{ data: (): unknown => ({}) }] }
    ];

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.updated).toBe(1);
    expect(searchHistorySetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ governmentAverage: 30000 }),
      { merge: true }
    );
  });

  it('falls back a missing salary_max to 0 when averaging live jobs cache results', async () => {
    queryQueues.search_history = [
      {
        empty: false,
        docs: [
          {
            id: 'doc-live-avg',
            data: (): unknown => ({
              title: 'Engineer',
              country: 'UK',
              salary: 45000,
              historical_fetched_MCA_v2: false,
              mcaScore: null,
              governmentAverage: null
            })
          }
        ]
      }
    ];
    docGetQueues.adzuna_distribution_cache = [{ exists: false, data: (): unknown => undefined }];
    docGetQueues.adzuna_jobs_cache = [
      {
        exists: true,
        data: (): unknown => ({
          data: { results: [{}, { salary_max: 50000 }], count: 2 },
          gov_id_code: '2136'
        })
      }
    ];
    queryQueues.salary_benchmarks = [
      { empty: true, docs: [] },
      { empty: true, docs: [] }
    ];

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.updated).toBe(1);
  });

  it('falls back to sparse USA macro benchmark data', async () => {
    queryQueues.search_history = [
      {
        empty: false,
        docs: [
          {
            id: 'doc-usa-sparse',
            data: (): unknown => ({
              title: 'Engineer',
              country: 'USA',
              salary: 70000,
              historical_fetched_MCA_v2: false,
              mcaScore: null,
              governmentAverage: null
            })
          }
        ]
      }
    ];
    docGetQueues.adzuna_distribution_cache = [{ exists: false, data: (): unknown => undefined }];
    docGetQueues.adzuna_jobs_cache = [
      {
        exists: true,
        data: (): unknown => ({ data: { results: [{ salary_max: 75000 }], count: 1 } })
      }
    ];
    queryQueues.salary_benchmarks = [
      { empty: true, docs: [] },
      { empty: false, docs: [{ data: (): unknown => ({}) }] }
    ];

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.updated).toBe(1);
  });

  it('records "Unknown error" when a per-doc failure throws a non-Error value', async () => {
    queryQueues.search_history = [
      {
        empty: false,
        docs: [
          {
            id: 'doc-non-error',
            data: (): unknown => ({
              title: 'Engineer',
              country: 'UK',
              historical_fetched_MCA_v2: false,
              mcaScore: null,
              governmentAverage: null
            })
          }
        ]
      }
    ];
    docGetQueues.adzuna_distribution_cache = [
      {
        exists: true,
        data: (): never => {
          throw 'a string failure';
        }
      }
    ];

    const event = {} as unknown as H3Event;
    const res = await handler(event);

    expect(res.failed).toBe(1);
    expect(res.failReasons).toContain('Unknown error');
  });

  it('falls back to a generic message when the top-level failure has no message', async () => {
    mockCollection.mockImplementationOnce(() => ({
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockRejectedValue(undefined)
    }));

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Backfill failed');
  });

  it('wraps a top-level query failure in a 500', async () => {
    mockCollection.mockImplementationOnce(() => ({
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockRejectedValue(new Error('firestore unavailable'))
    }));

    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('firestore unavailable');
  });
});
