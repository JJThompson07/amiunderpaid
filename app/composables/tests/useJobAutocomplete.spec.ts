import type { Ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useJobAutocomplete } from '../useJobAutocomplete';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  getFirestore: vi.fn(),
  Timestamp: { now: vi.fn() }
}));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn() }));

// Mock refs
vi.stubGlobal('ref', <T>(val: T) => ({ value: val }));

// Mock useDebounceFn - just call the function directly
vi.stubGlobal('useDebounceFn', (fn: (...args: unknown[]) => unknown) => {
  return (...args: unknown[]): unknown => fn(...args);
});

// Builds a fake `Ref<string>` for tests that don't run through the real `ref()` composable.
const mockRef = (value: string): Ref<string> => ({ value }) as unknown as Ref<string>;

const mockSearch = vi.fn();
const mockSearchForFacetValues = vi.fn();
const mockInitIndex = vi.fn(() => ({
  search: mockSearch,
  searchForFacetValues: mockSearchForFacetValues
}));

vi.stubGlobal('useNuxtApp', () => ({
  $algolia: {
    initIndex: mockInitIndex
  }
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

    const country = mockRef('UK');
    const location = mockRef('');
    const title = mockRef('');

    const composable = useJobAutocomplete(country, location, title);
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
      hits: [{ title: 'Teacher', id_code: '456' }]
    });

    const country = mockRef('USA');
    const location = mockRef('New York');
    const title = mockRef('');

    const composable = useJobAutocomplete(country, location, title);
    composable.locationOptions.value = [{ label: 'New York', value: 'New York' }];
    await composable.fetchTitles('teach');

    expect(mockInitIndex).toHaveBeenCalledWith('regional_salary_benchmarks');
    expect(mockSearch).toHaveBeenCalledWith('teach', {
      filters: 'country:USA AND searchLocation:"new york"',
      hitsPerPage: 20
    });
    expect(composable.titleOptions.value).toEqual([{ label: 'Teacher', value: 'Teacher' }]);
    expect(composable.labelToIdMap.value).toEqual({
      Teacher: '456'
    });
  });

  it('does not fetch if search term is less than 2 chars', async () => {
    const country = mockRef('UK');
    const location = mockRef('');
    const title = mockRef('');
    const composable = useJobAutocomplete(country, location, title);
    composable.titleOptions.value = [{ label: 'test', value: 'test' }];

    await composable.fetchTitles('a');
    expect(composable.titleOptions.value).toEqual([]);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('fetches UK locations correctly', async () => {
    mockSearchForFacetValues.mockResolvedValueOnce({
      facetHits: [{ value: 'London' }]
    });

    const country = mockRef('UK');
    const location = mockRef('');
    const title = mockRef('');

    const composable = useJobAutocomplete(country, location, title);
    await composable.fetchLocations('lon');

    expect(mockInitIndex).toHaveBeenCalledWith('regional_salary_benchmarks');
    expect(mockSearchForFacetValues).toHaveBeenCalledWith('location', 'lon', {
      filters: 'country:UK',
      maxFacetHits: 20
    });
    expect(composable.locationOptions.value).toEqual([{ label: 'London', value: 'London' }]);
  });

  it('fetches USA locations correctly with title filter', async () => {
    mockSearchForFacetValues.mockResolvedValueOnce({
      facetHits: [{ value: 'New York' }]
    });

    const country = mockRef('USA');
    const location = mockRef('');
    const title = mockRef('Teacher');

    const composable = useJobAutocomplete(country, location, title);
    composable.titleOptions.value = [{ label: 'Teacher', value: 'Teacher' }];
    await composable.fetchLocations('new');

    expect(mockSearchForFacetValues).toHaveBeenCalledWith('location', 'new', {
      filters: 'country:USA AND searchTitle:"teacher"',
      maxFacetHits: 20
    });
    expect(composable.locationOptions.value).toEqual([{ label: 'New York', value: 'New York' }]);
  });

  it('fetches USA locations without title filter', async () => {
    mockSearchForFacetValues.mockResolvedValueOnce({
      facetHits: [{ value: 'Texas' }]
    });

    const country = mockRef('USA');
    const location = mockRef('');
    const title = mockRef('');

    const composable = useJobAutocomplete(country, location, title);
    await composable.fetchLocations('tex');

    expect(mockSearchForFacetValues).toHaveBeenCalledWith('location', 'tex', {
      filters: 'country:USA',
      maxFacetHits: 20
    });
  });

  it('fetchTitles ignores error', async () => {
    mockSearch.mockRejectedValueOnce(new Error('Failed'));
    const country = mockRef('UK');
    const composable = useJobAutocomplete(country, mockRef(''), mockRef(''));
    await composable.fetchTitles('error-dev');
    expect(composable.titleOptions.value).toEqual([]);
    expect(composable.fetching.value).toBe(false);
  });

  it('fetchLocations ignores error', async () => {
    mockSearchForFacetValues.mockRejectedValueOnce(new Error('Failed'));
    const country = mockRef('UK');
    const composable = useJobAutocomplete(country, mockRef(''), mockRef(''));
    await composable.fetchLocations('error-lon');
    expect(composable.locationOptions.value).toEqual([]);
    expect(composable.fetching.value).toBe(false);
  });

  it('does not fetch locations if search term is less than 2 chars', async () => {
    const composable = useJobAutocomplete(mockRef('UK'), mockRef(''), mockRef(''));
    composable.locationOptions.value = [{ label: 'test', value: 'test' }];

    await composable.fetchLocations('a');
    expect(composable.locationOptions.value).toEqual([]);
  });

  it('fetches titles only once if the exact same search is made (cache hit)', async () => {
    mockSearch.mockResolvedValue({
      hits: [{ title: 'Unique Title' }]
    });

    const country = mockRef('UK');
    const location = mockRef('');
    const title = mockRef('');
    const composable = useJobAutocomplete(country, location, title);

    // First call
    await composable.fetchTitles('unique-search');
    expect(mockSearch).toHaveBeenCalledTimes(1);

    // Second call with the same term (should hit cache)
    await composable.fetchTitles('unique-search');
    // Ensure mockSearch was not called again
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it('fetches titles again if the search term is the same but the location context changes (cache miss)', async () => {
    mockSearch.mockResolvedValue({
      hits: [{ title: 'Another Title' }]
    });

    const country = mockRef('USA');
    const location = mockRef('');
    const title = mockRef('');
    const composable = useJobAutocomplete(country, location, title);

    // First call (location is empty)
    await composable.fetchTitles('another-search');

    // Change the location context
    location.value = 'Texas';
    composable.locationOptions.value = [{ label: 'Texas', value: 'Texas' }];

    // Second call with the same term but different location
    await composable.fetchTitles('another-search');

    // Should have called Algolia again because the context changed
    expect(mockSearch).toHaveBeenCalledTimes(2);
  });

  it('fetches locations only once if the exact same search is made (cache hit)', async () => {
    mockSearchForFacetValues.mockResolvedValue({
      facetHits: [{ value: 'Unique Location' }]
    });

    const country = mockRef('UK');
    const location = mockRef('');
    const title = mockRef('');
    const composable = useJobAutocomplete(country, location, title);

    // First call
    await composable.fetchLocations('unique-loc');
    expect(mockSearchForFacetValues).toHaveBeenCalledTimes(1);

    // Second call
    await composable.fetchLocations('unique-loc');
    expect(mockSearchForFacetValues).toHaveBeenCalledTimes(1);
  });
});
