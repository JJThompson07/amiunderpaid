import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';
import type { JobSearchResponse } from '~~/shared/utils/market-data';

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => 'server-timestamp')
  }
}));

const mockConfig = { adzunaAppId: 'test-id', adzunaAppKey: 'test-key' };
vi.stubGlobal('useRuntimeConfig', () => mockConfig);
vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
const useAdminFirestoreMock = vi.fn();
vi.stubGlobal('useAdminFirestore', useAdminFirestoreMock);
vi.stubGlobal(
  'generateCacheKey',
  vi.fn(() => 'cache-key')
);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});
vi.stubGlobal(
  'sanitizeAdzunaData',
  vi.fn(<T>(data: T): T => data)
);
const $fetchMock = vi.fn();
vi.stubGlobal('$fetch', $fetchMock);
const getQueryMock = vi.fn();
vi.stubGlobal('getQuery', getQueryMock);
vi.stubGlobal('defineCachedFunction', <T>(fn: T): T => fn);

// We need to mock the import of `../../utils/reed` and `../../utils/jooble` that happens inside the catch block
vi.mock('../../../utils/reed', () => ({
  fetchReedData: vi.fn().mockResolvedValue({
    mean: 50000,
    count: 10,
    results: [{ id: 1, title: 'Reed Job', provider: 'reed' }],
    provider: 'reed'
  })
}));

vi.mock('../../../utils/jooble', () => ({
  fetchJoobleData: vi.fn().mockResolvedValue({
    mean: 100000,
    count: 20,
    results: [{ id: 2, title: 'Jooble Job', provider: 'jooble' }],
    provider: 'jooble'
  })
}));

type MockDocRef = {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
};

type MockCollection = {
  doc: ReturnType<typeof vi.fn>;
};

let jobsHandler: (event: H3Event) => Promise<JobSearchResponse>;

describe('Adzuna Jobs API - 429 Fallback', () => {
  let mockDocRef: MockDocRef;
  let mockCollection: MockCollection;

  beforeEach(async () => {
    vi.clearAllMocks();
    if (!jobsHandler) {
      jobsHandler = (await import('../jobs')).default;
    }

    mockDocRef = {
      get: vi.fn().mockResolvedValue({ exists: false }),
      set: vi.fn()
    };

    mockCollection = {
      doc: vi.fn(() => mockDocRef)
    };

    const mockDb = {
      collection: vi.fn(() => mockCollection)
    };

    useAdminFirestoreMock.mockReturnValue(mockDb);
  });

  it('should fall back to Reed API if Adzuna returns 429 for gb', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      location: 'london',
      country: 'gb',
      resultsPerPage: '10'
    });

    // Mock Adzuna throwing 429
    $fetchMock.mockRejectedValueOnce({
      statusCode: 429,
      response: { status: 429 }
    });

    const result = await jobsHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledTimes(1);

    // We expect it to hit the reed fallback and return provider: 'reed'
    expect(result.provider).toBe('reed');
    expect(result.count).toBe(10);
    expect(result.results[0]?.title).toBe('Reed Job');

    // Ensure we cached the fallback data
    expect(mockDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ provider: 'reed' })
      }),
      { merge: true }
    );
  });

  it('should fall back to Jooble API if Adzuna returns 429 for usa', async () => {
    vi.mocked(getQueryMock).mockReturnValue({
      title: 'Software Engineer',
      country: 'us'
    });

    vi.mocked($fetchMock).mockRejectedValueOnce({
      response: { status: 429 }
    });

    // Expect the promise to resolve successfully with fallback data
    const result = await jobsHandler({} as unknown as H3Event);
    expect(result.provider).toBe('jooble');
    expect(result.count).toBe(20);
    expect(result.results[0]?.title).toBe('Jooble Job');
  });

  it('should fall back to Jooble API if Adzuna returns 0 results for usa', async () => {
    vi.mocked(getQueryMock).mockReturnValue({
      title: 'Software Engineer',
      country: 'us'
    });

    // Mock Adzuna returning 0 results successfully
    vi.mocked($fetchMock).mockResolvedValueOnce({
      count: 0,
      results: []
    });

    // Expect the promise to resolve successfully with fallback data
    const result = await jobsHandler({} as unknown as H3Event);
    expect(result.provider).toBe('jooble');
    expect(result.count).toBe(20);
  });
});
