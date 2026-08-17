import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMacroData } from '../useMacroData';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  getFirestore: vi.fn(),
  Timestamp: { now: vi.fn() }
}));
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
    initIndex: mockInitIndex
  }
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
      hits: [{ searchLocation: 'New York', avg_salary: 60000, salary: 60000 }]
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

  it('handles empty national and regional hits gracefully', async () => {
    mockNationalSearch.mockResolvedValueOnce({
      hits: []
    });

    mockRegionalSearch.mockResolvedValueOnce({
      hits: []
    });

    const composable = useMacroData();
    const result = await composable.fetchMacroBaselines('UK', 'London');

    expect(result.macroNationalData.mean).toBe(0);
    expect(result.macroNationalData.p50).toBe(0);
    expect(result.userRegionalData).toBeNull();
    expect(result.allRegionalData).toEqual({});
  });

  it('handles missing salary fields by falling back to salary or 0', async () => {
    mockNationalSearch.mockResolvedValueOnce({
      // avg_salary is missing, so it should fall back to salary, then 0
      hits: [{ salary: 32000 }]
    });

    mockRegionalSearch.mockResolvedValueOnce({
      hits: [
        // searchLocation is present but avg_salary is missing
        { searchLocation: 'London', salary: 42000 },
        // missing searchLocation should be ignored
        { avg_salary: 28000 },
        // missing both avg_salary and salary
        { searchLocation: 'North' }
      ]
    });

    const composable = useMacroData();
    const result = await composable.fetchMacroBaselines('UK', 'London');

    expect(result.macroNationalData.mean).toBe(32000);
    expect(result.macroNationalData.p50).toBe(32000);

    expect(result.userRegionalData?.mean).toBe(42000);
    expect(result.userRegionalData?.p50).toBe(42000);

    expect(result.allRegionalData['north']).toBeDefined();
    expect(result.allRegionalData['north']!.mean).toBe(0);
    expect(result.allRegionalData['north']!.p50).toBe(0);
  });

  it('handles missing userLocation or unmatched location', async () => {
    mockNationalSearch.mockResolvedValueOnce({
      hits: [{ avg_salary: 30000 }]
    });

    mockRegionalSearch.mockResolvedValueOnce({
      hits: [{ searchLocation: 'London', avg_salary: 40000 }]
    });

    const composable = useMacroData();
    // Pass a location that does not match
    const result = await composable.fetchMacroBaselines('UK', 'Manchester');

    expect(result.userRegionalData).toBeNull();
    expect(result.regionalMedianAllRoles).toBeNull();
  });
});
