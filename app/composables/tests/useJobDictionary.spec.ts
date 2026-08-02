import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useJobDictionary } from '../useJobDictionary';

vi.mock('firebase/firestore', () => ({ doc: vi.fn(), collection: vi.fn(), getFirestore: vi.fn(), Timestamp: { now: vi.fn() } }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn() }));

const mockCurrentCountry = { value: 'UK' };
vi.stubGlobal('useRegion', () => ({ currentCountry: mockCurrentCountry }));

const mockSearch = vi.fn();
const mockInitIndex = vi.fn(() => ({
  search: mockSearch,
}));

vi.stubGlobal('useNuxtApp', () => ({
  $algolia: {
    initIndex: mockInitIndex,
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

describe('useJobDictionary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentCountry.value = 'UK';
  });

  it('returns exact match from Firestore', async () => {
    mockFetch.mockResolvedValueOnce({
      matches: [{ id_code: '123', group_name: 'Tech' }]
    });

    const composable = useJobDictionary();
    const result = await composable.resolveJobId('software engineer');

    expect(mockFetch).toHaveBeenCalledWith('/api/engine/match-title', {
      query: { title: 'software engineer', country: 'UK' }
    });
    expect(result).toEqual({ type: 'exact', id: '123', group_name: 'Tech' });
  });

  it('returns ambiguous match from Firestore', async () => {
    mockFetch.mockResolvedValueOnce({
      matches: [
        { id_code: '123', group_name: 'Tech' },
        { id_code: '456', group_name: 'IT' }
      ]
    });

    const composable = useJobDictionary();
    const result = await composable.resolveJobId('software');

    expect(result).toEqual({
      type: 'ambiguous',
      id: null,
      options: [
        { id_code: '123', group_name: 'Tech' },
        { id_code: '456', group_name: 'IT' }
      ]
    });
  });

  it('returns exact match from Algolia via exact group name', async () => {
    mockFetch.mockResolvedValueOnce({ matches: [] }); // No Firestore match

    mockSearch.mockResolvedValueOnce({
      hits: [
        { gov_id: '789', group_name: 'Software Developer', titles: [] }
      ]
    });

    const composable = useJobDictionary();
    const result = await composable.resolveJobId('Software Developer');

    expect(mockInitIndex).toHaveBeenCalledWith('uk_job_groups');
    expect(mockSearch).toHaveBeenCalledWith('software developer', { removeWordsIfNoResults: 'allOptional', hitsPerPage: 5 });
    
    expect(result).toEqual({ type: 'exact', id: '789', group_name: 'Software Developer' });
  });

  it('returns exact match from Algolia via exact synonym', async () => {
    mockFetch.mockResolvedValueOnce({ matches: [] }); // No Firestore match

    mockSearch.mockResolvedValueOnce({
      hits: [
        { gov_id: '789', group_name: 'Software Developer', titles: ['coder', 'dev'] }
      ]
    });

    const composable = useJobDictionary();
    const result = await composable.resolveJobId('Dev');
    
    expect(result).toEqual({ type: 'exact', id: '789', group_name: 'Software Developer' });
  });

  it('returns ambiguous match from Algolia if no exact match', async () => {
    mockFetch.mockResolvedValueOnce({ matches: [] }); // No Firestore match

    mockSearch.mockResolvedValueOnce({
      hits: [
        { gov_id: '789', group_name: 'Software Developer', titles: ['coder'] }
      ]
    });

    const composable = useJobDictionary();
    // Search term "programming" matches partially but not exactly group or synonym
    const result = await composable.resolveJobId('programming');
    
    expect(result).toEqual({
      type: 'ambiguous',
      id: null,
      options: [{ id_code: '789', group_name: 'Software Developer' }]
    });
  });

  it('returns unmapped if Algolia returns no hits', async () => {
    mockFetch.mockResolvedValueOnce({ matches: [] }); // No Firestore match
    mockSearch.mockResolvedValueOnce({ hits: [] });

    const composable = useJobDictionary();
    const result = await composable.resolveJobId('unknown');
    
    expect(result).toEqual({ type: 'unmapped', id: null });
  });

  it('returns error if exception occurs', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const composable = useJobDictionary();
    const result = await composable.resolveJobId('error prone');

    expect(result).toEqual({
      type: 'error',
      id: null,
      message: 'An error occurred while resolving the job ID.'
    });
  });
});
