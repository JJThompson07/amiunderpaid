import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => 'server-timestamp')
  }
}));

const mockConfig = { adzunaAppId: 'test-id', adzunaAppKey: 'test-key' };
vi.stubGlobal('useRuntimeConfig', () => mockConfig);
vi.stubGlobal('defineEventHandler', (fn: any) => fn);
vi.stubGlobal('useAdminFirestore', vi.fn());
vi.stubGlobal('generateCacheKey', vi.fn(() => 'cache-key'));
vi.stubGlobal('createError', (err: any) => new Error(err.statusMessage));
vi.stubGlobal('sanitizeAdzunaData', vi.fn((data: any) => data));
const $fetchMock = vi.fn();
vi.stubGlobal('$fetch', $fetchMock);
const getQueryMock = vi.fn();
vi.stubGlobal('getQuery', getQueryMock);

// We need to mock the import of `../../utils/reed` that happens inside the catch block
vi.mock('../../../utils/reed', () => ({
  fetchReedData: vi.fn().mockResolvedValue({
    mean: 50000,
    count: 10,
    results: [{ id: 1, title: 'Reed Job', provider: 'reed' }],
    provider: 'reed'
  })
}));

let jobsHandler: any;

describe('Adzuna Jobs API - 429 Fallback', () => {
  let mockDocRef: any;
  let mockCollection: any;

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

    vi.mocked((globalThis as any).useAdminFirestore).mockReturnValue(mockDb);
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

    const result = await jobsHandler({} as any);

    expect($fetchMock).toHaveBeenCalledTimes(1);
    
    // We expect it to hit the reed fallback and return provider: 'reed'
    expect(result.provider).toBe('reed');
    expect(result.count).toBe(10);
    expect(result.results[0].title).toBe('Reed Job');
    
    // Ensure we cached the fallback data
    expect(mockDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ provider: 'reed' })
      }),
      { merge: true }
    );
  });

  it('should NOT fall back to Reed API if Adzuna returns 429 for usa', async () => {
    getQueryMock.mockReturnValue({
      title: 'developer',
      location: 'new york',
      country: 'usa',
      resultsPerPage: '10'
    });

    // Mock Adzuna throwing 429
    $fetchMock.mockRejectedValueOnce({
      statusCode: 429,
      response: { status: 429 }
    });

    // Expect the error to be thrown instead of falling back to Reed (Reed is UK-only)
    await expect(jobsHandler({} as any)).rejects.toThrow('Market data temporarily unavailable.');
  });
});
