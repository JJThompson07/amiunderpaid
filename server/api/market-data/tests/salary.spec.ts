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

// Mock `../../utils/reed` used in the fallback block
vi.mock('../../../utils/reed', () => ({
  fetchReedData: vi.fn().mockResolvedValue({
    histogram: { '50000': 1 },
    provider: 'reed'
  })
}));

let salaryHandler: any;

describe('Adzuna Salary API - 429 Fallback', () => {
  let mockDocRef: any;
  let mockCollection: any;

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

    vi.mocked((globalThis as any).useAdminFirestore).mockReturnValue(mockDb);
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

    const result = await salaryHandler({} as any);

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

  it('should NOT fall back to Reed API if Adzuna returns 429 for usa', async () => {
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

    // Expect the error to be thrown instead of falling back to Reed (Reed is UK-only)
    await expect(salaryHandler({} as any)).rejects.toThrow('Salary data temporarily unavailable.');
  });
});
