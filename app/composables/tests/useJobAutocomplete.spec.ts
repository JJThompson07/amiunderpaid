import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useJobAutocomplete } from '../useJobAutocomplete';

vi.mock('firebase/firestore', () => ({ doc: vi.fn(), collection: vi.fn(), getFirestore: vi.fn(), Timestamp: { now: vi.fn() } }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn() }));

// Mock refs
vi.stubGlobal('ref', (val: any) => ({ value: val }));

// Mock useDebounceFn - just call the function directly
vi.stubGlobal('useDebounceFn', (fn: Function) => {
  return (...args: any[]) => fn(...args);
});

const mockSearch = vi.fn();
const mockSearchForFacetValues = vi.fn();
const mockInitIndex = vi.fn(() => ({
  search: mockSearch,
  searchForFacetValues: mockSearchForFacetValues,
}));

vi.stubGlobal('useNuxtApp', () => ({
  $algolia: {
    initIndex: mockInitIndex,
  },
}));

describe('useJobAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches UK titles correctly', async () => {
    mockSearch.mockResolvedValueOnce({
      hits: [
        { title: 'Software Engineer', group: 'Tech (123)', soc: '123' },
        { title: 'Developer' }
      ]
    });
    
    const country = { value: 'UK' };
    const location = { value: '' };
    const title = { value: '' };
    
    const composable = useJobAutocomplete(country as any, location as any, title as any);
    await composable.fetchTitles('soft');
    
    expect(mockInitIndex).toHaveBeenCalledWith('job_titles');
    expect(mockSearch).toHaveBeenCalledWith('soft', { filters: 'country:UK', hitsPerPage: 100 });
    expect(composable.titleOptions.value).toEqual([
      { label: 'Software Engineer (Tech)', value: 'Software Engineer (Tech)' },
      { label: 'Developer', value: 'Developer' }
    ]);
    expect(composable.labelToIdMap.value).toEqual({
      'Software Engineer (Tech)': '123'
    });
  });

  it('fetches USA titles correctly with location filter', async () => {
    mockSearch.mockResolvedValueOnce({
      hits: [
        { title: 'Teacher', id_code: '456' },
      ]
    });
    
    const country = { value: 'USA' };
    const location = { value: 'New York' };
    const title = { value: '' };
    
    const composable = useJobAutocomplete(country as any, location as any, title as any);
    composable.locationOptions.value = [{ label: 'New York', value: 'New York' }];
    await composable.fetchTitles('teach');
    
    expect(mockInitIndex).toHaveBeenCalledWith('regional_salary_benchmarks');
    expect(mockSearch).toHaveBeenCalledWith('teach', { filters: 'country:USA AND searchLocation:"new york"', hitsPerPage: 20 });
    expect(composable.titleOptions.value).toEqual([
      { label: 'Teacher', value: 'Teacher' }
    ]);
    expect(composable.labelToIdMap.value).toEqual({
      'Teacher': '456'
    });
  });

  it('does not fetch if search term is less than 2 chars', async () => {
    const country = { value: 'UK' };
    const location = { value: '' };
    const title = { value: '' };
    const composable = useJobAutocomplete(country as any, location as any, title as any);
    composable.titleOptions.value = [{ label: 'test', value: 'test' }];
    
    await composable.fetchTitles('a');
    expect(composable.titleOptions.value).toEqual([]);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('fetches UK locations correctly', async () => {
    mockSearchForFacetValues.mockResolvedValueOnce({
      facetHits: [
        { value: 'London' }
      ]
    });
    
    const country = { value: 'UK' };
    const location = { value: '' };
    const title = { value: '' };
    
    const composable = useJobAutocomplete(country as any, location as any, title as any);
    await composable.fetchLocations('lon');
    
    expect(mockInitIndex).toHaveBeenCalledWith('regional_salary_benchmarks');
    expect(mockSearchForFacetValues).toHaveBeenCalledWith('location', 'lon', { filters: 'country:UK', maxFacetHits: 20 });
    expect(composable.locationOptions.value).toEqual([
      { label: 'London', value: 'London' }
    ]);
  });
});
