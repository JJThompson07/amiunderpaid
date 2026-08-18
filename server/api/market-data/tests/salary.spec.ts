import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

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

// Mock `../../utils/reed` used in the fallback block
vi.mock('../../../utils/reed', () => ({
  fetchReedData: vi.fn().mockResolvedValue({
    histogram: { '50000': 1 },
    provider: 'reed'
  })
}));

vi.mock('../../../utils/jooble', () => ({
  fetchJoobleData: vi.fn().mockResolvedValue({
    histogram: { '100000': 2 },
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

// Mirrors the (unexported) `MarketSalaryResult` shape returned by ../salary,
// scoped down to the fields these tests actually assert on.
type SalaryApiResult = {
  histogram?: Record<string, number>;
  provider: string;
};

let salaryHandler: (event: H3Event) => Promise<SalaryApiResult>;

describe('Adzuna Salary API - 429 Fallback', () => {
  let mockDocRef: MockDocRef;
  let mockCollection: MockCollection;

  beforeEach(async () => {
    vi.clearAllMocks();
    if (!salaryHandler) {
      salaryHandler = (await import('../salary')).default;
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
      country: 'gb'
    });

    // Mock Adzuna throwing 429
    $fetchMock.mockRejectedValueOnce({
      statusCode: 429,
      response: { status: 429 }
    });

    const result = await salaryHandler({} as unknown as H3Event);

    expect($fetchMock).toHaveBeenCalledTimes(1);

    // Expect Reed fallback data
    expect(result.provider).toBe('reed');
    expect(result.histogram).toEqual({ '50000': 1 });

    // Verify fallback data is cached
    expect(mockDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ provider: 'reed', histogram: { '50000': 1 } })
      })
    );
  });

  it('should fall back to Jooble API if Adzuna returns 429 for usa', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      location: 'new york',
      country: 'usa'
    });

    // Mock Adzuna throwing 429
    $fetchMock.mockRejectedValueOnce({
      statusCode: 429,
      response: { status: 429 }
    });

    // Expect successful fallback to Jooble for USA!
    const result = await salaryHandler({} as unknown as H3Event);
    expect(result.provider).toBe('jooble');
    expect(result.histogram).toEqual({ '100000': 2 });
  });

  it('should fall back to Jooble API if Adzuna returns empty histogram for usa', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      location: 'new york',
      country: 'usa'
    });

    // Mock Adzuna returning empty histogram successfully
    $fetchMock.mockResolvedValueOnce({
      histogram: {}
    });

    // Expect successful fallback to Jooble for USA!
    const result = await salaryHandler({} as unknown as H3Event);
    expect(result.provider).toBe('jooble');
    expect(result.histogram).toEqual({ '100000': 2 });
  });
});
