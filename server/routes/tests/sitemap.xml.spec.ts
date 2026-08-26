import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

const getRequestURLMock = vi.fn();
const setHeaderMock = vi.fn();
vi.mock('h3', () => ({
  defineEventHandler: <T>(fn: T): T => fn,
  getRequestURL: getRequestURLMock,
  setHeader: setHeaderMock
}));

const useAdminFirestoreMock = vi.fn();
vi.mock('../../utils/firebase', () => ({ useAdminFirestore: useAdminFirestoreMock }));

type MockDocs<T> = { data: () => T }[];

// A minimal chainable Firestore query stub: every method but `get` returns
// itself, so `.select(...).where(...).limit(...).get()` (or any subset/order
// of those calls) all resolve to the same configured snapshot.
const makeChainableQuery = <T>(docs: MockDocs<T>): Record<string, ReturnType<typeof vi.fn>> => {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'where', 'limit']) {
    query[method] = vi.fn(() => query);
  }
  query.get = vi.fn().mockResolvedValue({ docs });
  return query;
};

let sitemapHandler: (event: H3Event) => Promise<string>;

describe('sitemap.xml', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    if (!sitemapHandler) {
      sitemapHandler = (await import('../sitemap.xml')).default;
    }
  });

  const mockDb = (jobsDocs: MockDocs<unknown>, industryDocs: MockDocs<unknown>): void => {
    const jobsQuery = makeChainableQuery(jobsDocs);
    const industryQuery = makeChainableQuery(industryDocs);
    useAdminFirestoreMock.mockReturnValue({
      collection: vi.fn((name: string) =>
        name === 'adzuna_industry_trends' ? industryQuery : jobsQuery
      )
    });
  };

  it('scopes industry trend routes to gb on the UK amiunderpaid domain and dedupes tags', async () => {
    getRequestURLMock.mockReturnValue({ origin: 'https://www.amiunderpaid.co.uk' });
    mockDb(
      [],
      [
        { data: (): { categoryTag: string } => ({ categoryTag: 'it-jobs' }) },
        { data: (): { categoryTag: string } => ({ categoryTag: 'it-jobs' }) }
      ]
    );

    const xml = await sitemapHandler({} as unknown as H3Event);

    expect(xml).toContain(
      '<loc>https://www.amiunderpaid.co.uk/insights/industry-trends/it-jobs</loc>'
    );
    expect(xml.match(/it-jobs/g)).toHaveLength(1);
  });

  it('scopes industry trend routes to us on the US amiunderpaid domain', async () => {
    getRequestURLMock.mockReturnValue({ origin: 'https://www.amiunderpaid.com' });
    mockDb([], [{ data: (): { categoryTag: string } => ({ categoryTag: 'sales-jobs' }) }]);

    const xml = await sitemapHandler({} as unknown as H3Event);

    expect(xml).toContain(
      '<loc>https://www.amiunderpaid.com/insights/industry-trends/sales-jobs</loc>'
    );
  });

  it('includes categories from every country on the benchmark domain', async () => {
    getRequestURLMock.mockReturnValue({ origin: 'https://www.benchmarkmyrole.com' });
    mockDb(
      [],
      [
        { data: (): { categoryTag: string } => ({ categoryTag: 'it-jobs' }) },
        { data: (): { categoryTag: string } => ({ categoryTag: 'admin-jobs' }) }
      ]
    );

    const xml = await sitemapHandler({} as unknown as H3Event);

    expect(xml).toContain('/insights/industry-trends/it-jobs');
    expect(xml).toContain('/insights/industry-trends/admin-jobs');
  });

  it('skips industry trend docs with no categoryTag', async () => {
    getRequestURLMock.mockReturnValue({ origin: 'https://www.amiunderpaid.co.uk' });
    mockDb([], [{ data: (): { categoryTag: string } => ({ categoryTag: '' }) }]);

    const xml = await sitemapHandler({} as unknown as H3Event);

    expect(xml).not.toContain('/insights/industry-trends/undefined');
    expect(xml).toContain('/insights/industry-trends</loc>');
  });
});
