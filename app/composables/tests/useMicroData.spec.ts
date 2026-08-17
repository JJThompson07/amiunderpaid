import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMicroData } from '../useMicroData';

const mockSearch = vi.fn();
const mockInitIndex = vi.fn(() => ({
  search: mockSearch,
}));

vi.stubGlobal('useNuxtApp', () => ({
  $algolia: {
    initIndex: mockInitIndex,
  },
}));

vi.stubGlobal('ref', (val: any) => ({ value: val }));

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
      hits: [
        { title: 'Software Developer', salary: 50000, avg_salary: 51000 }
      ]
    });
    mockSearch.mockResolvedValueOnce({
      hits: [
        { searchLocation: 'London', salary: 60000 }
      ]
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
      hitsPerPage: 100
    });

    expect(result.officialGroupTitle).toBe('Software Developer');
    expect(result.microNationalData?.p50).toBe(50000);
    expect(result.microNationalData?.mean).toBe(51000);
    expect(result.microRegionalData?.p50).toBe(60000);
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
