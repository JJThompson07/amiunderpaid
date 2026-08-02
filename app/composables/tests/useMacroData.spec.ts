import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMacroData } from '../useMacroData';

vi.mock('firebase/firestore', () => ({ doc: vi.fn(), collection: vi.fn(), getFirestore: vi.fn(), Timestamp: { now: vi.fn() } }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn() }));

const mockNationalSearch = vi.fn();
const mockRegionalSearch = vi.fn();

const mockInitIndex = vi.fn((indexName: string) => {
  if (indexName === 'salary_benchmarks') {
    return { search: mockNationalSearch };
  }
  if (indexName === 'regional_salary_benchmarks') {
    return { search: mockRegionalSearch };
  }
  return { search: vi.fn() };
});

vi.stubGlobal('useNuxtApp', () => ({
  $algolia: {
    initIndex: mockInitIndex,
  },
}));

// Mock refs
vi.stubGlobal('ref', (val: any) => ({ value: val }));

describe('useMacroData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches UK macro data correctly', async () => {
    mockNationalSearch.mockResolvedValueOnce({
      hits: [{ avg_salary: 30000, salary: 30000, salary_25_pt: 25000, salary_75_pt: 40000 }]
    });

    mockRegionalSearch.mockResolvedValueOnce({
      hits: [
        { searchLocation: 'London', avg_salary: 40000, salary: 40000 },
        { searchLocation: 'North West', avg_salary: 28000, salary: 28000 }
      ]
    });

    const composable = useMacroData();
    const result = await composable.fetchMacroBaselines('UK', 'London');

    expect(mockNationalSearch).toHaveBeenCalledWith('', {
      filters: 'country:UK AND searchTitle:"all employees" AND searchLocation:"united kingdom"',
      hitsPerPage: 1
    });

    expect(mockRegionalSearch).toHaveBeenCalledWith('', {
      filters: 'country:UK AND searchTitle:"all employees" AND NOT searchLocation:"uk"',
      hitsPerPage: 1000
    });

    expect(result.macroNationalData).toEqual({
      mean: 30000,
      p10: null,
      p25: 25000,
      p50: 30000,
      p75: 40000,
      p90: null
    });

    expect(result.userRegionalData).toEqual({
      mean: 40000,
      p10: null,
      p25: null,
      p50: 40000,
      p75: null,
      p90: null
    });

    expect(result.nationalMedianAllRoles).toBe(30000);
    expect(result.regionalMedianAllRoles).toBe(40000);
  });

  it('fetches USA macro data correctly', async () => {
    mockNationalSearch.mockResolvedValueOnce({
      hits: [{ avg_salary: 50000, salary: 50000 }]
    });

    mockRegionalSearch.mockResolvedValueOnce({
      hits: [
        { searchLocation: 'New York', avg_salary: 60000, salary: 60000 },
      ]
    });

    const composable = useMacroData();
    const result = await composable.fetchMacroBaselines('USA', 'New York');

    expect(mockNationalSearch).toHaveBeenCalledWith('', {
      filters: 'country:USA AND id_code:"00-0000"',
      hitsPerPage: 1
    });

    expect(mockRegionalSearch).toHaveBeenCalledWith('', {
      filters: 'country:USA AND id_code:"00-0000"',
      hitsPerPage: 1000
    });

    expect(result.userRegionalData).toBeDefined();
    expect(result.userRegionalData?.mean).toBe(60000);
  });

  it('handles errors gracefully by returning fallback data', async () => {
    mockNationalSearch.mockRejectedValueOnce(new Error('Algolia error'));

    const composable = useMacroData();
    const result = await composable.fetchMacroBaselines('UK', 'London');

    expect(result.macroNationalData.p50).toBe(35000);
    expect(result.userRegionalData).toBeNull();
    expect(result.allRegionalData).toEqual({});
  });
});
