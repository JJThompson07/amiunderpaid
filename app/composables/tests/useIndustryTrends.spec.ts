import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useIndustryTrends } from '../useIndustryTrends';

const mockCurrentCountry = { value: 'UK' as 'UK' | 'USA' };

vi.stubGlobal('useRegion', () => ({ currentCountry: mockCurrentCountry }));
vi.stubGlobal('computed', <T>(fn: () => T) => ({
  get value(): T {
    return fn();
  }
}));

const fetchMock = vi.fn();
vi.stubGlobal('$fetch', fetchMock);

const useAsyncDataMock = vi.fn();
vi.stubGlobal('useAsyncData', useAsyncDataMock);

describe('useIndustryTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentCountry.value = 'UK';
  });

  it('requests the country-scoped endpoint with a country-keyed cache key', async () => {
    fetchMock.mockResolvedValue({
      country: 'gb',
      industries: [{ categoryTag: 'it-jobs', label: 'IT Jobs', history: [], lookupCount: 5 }]
    });
    let capturedHandler: (() => Promise<unknown>) | null = null;
    useAsyncDataMock.mockImplementation((key: string, handler: () => Promise<unknown>) => {
      capturedHandler = handler;
      return { data: { value: undefined }, pending: { value: true }, error: { value: undefined } };
    });

    useIndustryTrends();

    expect(useAsyncDataMock.mock.calls[0]?.[0]).toBe('industry-trends-gb');
    await capturedHandler!();
    expect(fetchMock).toHaveBeenCalledWith('/api/market-data/industry-trends', {
      params: { country: 'gb' }
    });
  });

  it('keys the request by US country code on the US site', () => {
    mockCurrentCountry.value = 'USA';
    useAsyncDataMock.mockReturnValue({
      data: { value: undefined },
      pending: { value: true },
      error: { value: undefined }
    });

    useIndustryTrends();

    expect(useAsyncDataMock.mock.calls[0]?.[0]).toBe('industry-trends-us');
  });

  it('maps a resolved response onto the industries list', () => {
    useAsyncDataMock.mockReturnValue({
      data: {
        value: {
          country: 'gb',
          industries: [{ categoryTag: 'it-jobs', label: 'IT Jobs', history: [], lookupCount: 5 }]
        }
      },
      pending: { value: false },
      error: { value: undefined }
    });

    const { industries, loading, error } = useIndustryTrends();

    expect(industries.value).toEqual([
      { categoryTag: 'it-jobs', label: 'IT Jobs', history: [], lookupCount: 5 }
    ]);
    expect(loading.value).toBe(false);
    expect(error.value).toBe(false);
  });

  it('defaults to an empty list and surfaces a boolean error when the fetch fails', () => {
    useAsyncDataMock.mockReturnValue({
      data: { value: undefined },
      pending: { value: false },
      error: { value: new Error('boom') }
    });

    const { industries, error } = useIndustryTrends();

    expect(industries.value).toEqual([]);
    expect(error.value).toBe(true);
  });
});
