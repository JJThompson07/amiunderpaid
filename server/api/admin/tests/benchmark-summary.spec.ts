import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';
import type { BenchmarkSummaryRow } from '../benchmark-summary.get';

type SummaryHandler = (event: H3Event) => Promise<BenchmarkSummaryRow[]>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});

const mockVerifyAdmin = vi.fn();
vi.stubGlobal('verifyAdmin', mockVerifyAdmin);

// each query records its collection and equality filters so the count can be looked up by key
type Filters = Record<string, unknown>;
let counts: Record<string, number>;
let failCount: boolean;

type CountQuery = {
  where: (field: string, op: string, value: unknown) => CountQuery;
  count: () => { get: () => Promise<{ data: () => { count: number } }> };
};

const makeQuery = (collection: string, filters: Filters): CountQuery => ({
  where: (field: string, _op: string, value: unknown): CountQuery =>
    makeQuery(collection, { ...filters, [field]: value }),
  count: (): ReturnType<CountQuery['count']> => ({
    get: (): Promise<{ data: () => { count: number } }> => {
      if (failCount) {
        return Promise.reject(new Error('firestore down'));
      }
      const key = `${collection}|${filters.country}|${filters.year}|${filters.period}`;
      return Promise.resolve({ data: () => ({ count: counts[key] ?? 0 }) });
    }
  })
});

const mockCollection = vi.fn((name: string) => makeQuery(name, {}));
vi.stubGlobal('useAdminFirestore', () => ({ collection: mockCollection }));

describe('admin benchmark-summary endpoint', () => {
  let handler: SummaryHandler;
  const year = new Date().getFullYear();

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    counts = {};
    failCount = false;
    mockVerifyAdmin.mockResolvedValue(undefined);
    const mod = await import('../benchmark-summary.get');
    handler = mod.default as unknown as SummaryHandler;
  });

  it('returns only datasets that hold records, tagged with their scope', async () => {
    counts[`salary_benchmarks|UK|${year - 1}|year`] = 500;
    counts[`regional_salary_benchmarks|USA|${year - 1}|year`] = 36920;

    const rows = await handler({} as H3Event);

    expect(rows).toEqual(
      expect.arrayContaining([
        { country: 'UK', year: year - 1, period: 'year', count: 500, scope: 'National' },
        { country: 'USA', year: year - 1, period: 'year', count: 36920, scope: 'Regional' }
      ])
    );
    expect(rows).toHaveLength(2);
  });

  it('checks both collections, both countries and the last five years', async () => {
    await handler({} as H3Event);

    // 2 collections × 2 countries × 5 years × 1 period
    expect(mockCollection).toHaveBeenCalledTimes(20);
    expect(mockCollection).toHaveBeenCalledWith('salary_benchmarks');
    expect(mockCollection).toHaveBeenCalledWith('regional_salary_benchmarks');
  });

  it('rejects non-admins before touching Firestore', async () => {
    mockVerifyAdmin.mockRejectedValue(new Error('Forbidden'));

    await expect(handler({} as H3Event)).rejects.toThrow('Forbidden');
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('fails loudly with an opaque 500 when a count fails', async () => {
    failCount = true;

    await expect(handler({} as H3Event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to load dataset summary.'
    });
  });
});
