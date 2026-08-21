import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMicroData } from '../useMicroData';

const mockSearch = vi.fn();
const mockInitIndex = vi.fn(() => ({
  search: mockSearch
}));

vi.stubGlobal('useNuxtApp', () => ({
  $algolia: {
    initIndex: mockInitIndex
  }
}));

vi.stubGlobal('ref', <T>(val: T) => ({ value: val }));

describe('useMicroData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes and exposes fetchMicroBaselines and fetching state', () => {
    const { fetching, fetchMicroBaselines } = useMicroData();
    expect(fetching.value).toBe(false);
    expect(typeof fetchMicroBaselines).toBe('function');
  });

  it('fetches micro baselines with UK idCode', async () => {
    mockSearch.mockResolvedValueOnce({
      hits: [{ title: 'Software Developer', salary: 50000, avg_salary: 51000 }]
    });
    mockSearch.mockResolvedValueOnce({
      hits: [{ searchLocation: 'London', salary: 60000 }]
    });

    const { fetchMicroBaselines } = useMicroData();
    const result = await fetchMicroBaselines('UK', 'Software Developer', 'London', '2136');

    expect(mockInitIndex).toHaveBeenCalledWith('salary_benchmarks');
    expect(mockInitIndex).toHaveBeenCalledWith('regional_salary_benchmarks');

    // First call (national)
    expect(mockSearch).toHaveBeenNthCalledWith(1, '', {
      filters: 'country:UK AND id_code:2136',
      hitsPerPage: 1
    });

    // Second call (regional)
    expect(mockSearch).toHaveBeenNthCalledWith(2, '', {
      filters: 'country:UK AND id_code:2136',
      hitsPerPage: 1000
    });

    expect(result.officialGroupTitle).toBe('Software Developer');
    expect(result.microNationalData?.p50).toBe(50000);
    expect(result.microNationalData?.mean).toBe(51000);
    expect(result.microRegionalData?.p50).toBe(60000);
  });

  it('requests up to 1000 regional hits so occupations spanning more than 100 UK regions are not truncated', async () => {
    // utils/locations/uk.ts carries ~400 ONS regions; a filter-only query
    // with no ranking returns an arbitrary subset if hitsPerPage is too low.
    const manyRegions = Array.from({ length: 250 }, (_, i) => ({
      searchLocation: `Region ${i}`,
      salary: 40000 + i
    }));
    mockSearch.mockResolvedValueOnce({ hits: [{ title: 'Nurse', salary: 42000 }] });
    mockSearch.mockResolvedValueOnce({ hits: manyRegions });

    const { fetchMicroBaselines } = useMicroData();
    const result = await fetchMicroBaselines('UK', 'Nurse', 'Region 249', '2231');

    expect(mockSearch).toHaveBeenNthCalledWith(2, '', {
      filters: 'country:UK AND id_code:2231',
      hitsPerPage: 1000
    });
    expect(Object.keys(result.allRegionalMicroData)).toHaveLength(250);
    expect(result.microRegionalData?.p50).toBe(40000 + 249);
  });

  it('pins microRegionalData for a known occupation/region pair', async () => {
    mockSearch.mockResolvedValueOnce({
      hits: [{ title: 'Registered Nurse', salary: 36000, avg_salary: 37500 }]
    });
    mockSearch.mockResolvedValueOnce({
      hits: [
        { searchLocation: 'North West', salary: 33000 },
        { searchLocation: 'London', salary: 41000, avg_salary: 42500 }
      ]
    });

    const { fetchMicroBaselines } = useMicroData();
    const result = await fetchMicroBaselines('UK', 'Registered Nurse', 'London', '2231');

    expect(result.microRegionalData).toEqual({
      mean: 42500,
      p10: null,
      p25: null,
      p50: 41000,
      p75: null,
      p90: null
    });
  });

  it('fetches micro baselines with USA idCode with quotes', async () => {
    mockSearch.mockResolvedValueOnce({ hits: [] });
    mockSearch.mockResolvedValueOnce({ hits: [] });

    const { fetchMicroBaselines } = useMicroData();
    await fetchMicroBaselines('USA', 'Data Scientist', null, '15-1221');

    expect(mockSearch).toHaveBeenNthCalledWith(1, '', {
      filters: 'country:USA AND (id_code:"15-1221")',
      hitsPerPage: 1
    });
  });

  it('fetches micro baselines with text fallback', async () => {
    mockSearch.mockResolvedValueOnce({ hits: [] });
    mockSearch.mockResolvedValueOnce({ hits: [] });

    const { fetchMicroBaselines } = useMicroData();
    await fetchMicroBaselines('UK', 'Data "Scientist"', null, null);

    expect(mockSearch).toHaveBeenNthCalledWith(1, '', {
      filters: 'country:UK AND searchTitle:"data \\"scientist\\""',
      hitsPerPage: 1
    });
  });

  it('handles search errors gracefully', async () => {
    mockSearch.mockRejectedValueOnce(new Error('Algolia Error'));

    const { fetchMicroBaselines, fetching } = useMicroData();
    const result = await fetchMicroBaselines('UK', 'Job');

    expect(result.microNationalData).toBeNull();
    expect(result.microRegionalData).toBeNull();
    expect(result.allRegionalMicroData).toEqual({});
    expect(result.officialGroupTitle).toBeNull();
    expect(fetching.value).toBe(false);
  });
});
