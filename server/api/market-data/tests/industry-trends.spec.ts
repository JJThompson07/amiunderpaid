import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import type { IndustryTrendsResponse } from '~~/shared/utils/market-data';

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('defineCachedFunction', <T>(fn: T): T => fn);
const useAdminFirestoreMock = vi.fn();
vi.stubGlobal('useAdminFirestore', useAdminFirestoreMock);
const getQueryMock = vi.fn();
vi.stubGlobal('getQuery', getQueryMock);

const makeSnapshot = (docs: unknown[]): { docs: { data: () => unknown }[] } => ({
  docs: docs.map((data) => ({ data: () => data }))
});

let industryTrendsHandler: (event: H3Event) => Promise<IndustryTrendsResponse>;

describe('industry-trends API', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    if (!industryTrendsHandler) {
      industryTrendsHandler = (await import('../industry-trends')).default;
    }
  });

  const mockTrendsDocs = (docs: unknown[]): void => {
    useAdminFirestoreMock.mockReturnValue({
      collection: vi.fn(() => ({
        where: vi.fn(() => ({ get: vi.fn().mockResolvedValue(makeSnapshot(docs)) }))
      }))
    });
  };

  it('passes through lookupCount already stored on the trend doc', async () => {
    getQueryMock.mockReturnValue({ country: 'gb' });
    mockTrendsDocs([
      { categoryTag: 'it-jobs', label: 'IT Jobs', history: [], lookupCount: 12 },
      { categoryTag: 'sales-jobs', label: 'Sales Jobs', history: [], lookupCount: 3 }
    ]);

    const result = await industryTrendsHandler({} as unknown as H3Event);

    expect(result.country).toBe('gb');
    expect(result.industries).toEqual([
      { categoryTag: 'it-jobs', label: 'IT Jobs', history: [], lookupCount: 12 },
      { categoryTag: 'sales-jobs', label: 'Sales Jobs', history: [], lookupCount: 3 }
    ]);
  });

  it('defaults lookupCount to 0 for docs written before that field existed', async () => {
    getQueryMock.mockReturnValue({ country: 'us' });
    mockTrendsDocs([{ categoryTag: 'unmatched-jobs', label: 'Unmatched Jobs', history: [] }]);

    const result = await industryTrendsHandler({} as unknown as H3Event);

    expect(result.industries).toEqual([
      { categoryTag: 'unmatched-jobs', label: 'Unmatched Jobs', history: [], lookupCount: 0 }
    ]);
  });

  it('falls back to categoryTag as the label when no label is stored', async () => {
    getQueryMock.mockReturnValue({ country: 'gb' });
    mockTrendsDocs([{ categoryTag: 'it-jobs', history: [], lookupCount: 5 }]);

    const result = await industryTrendsHandler({} as unknown as H3Event);

    expect(result.industries[0]?.label).toBe('it-jobs');
  });
});
