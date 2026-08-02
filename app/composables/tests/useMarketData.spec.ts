import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMarketData } from '../useMarketData';

const mockSearch = vi.fn();
const mockInitIndex = vi.fn(() => ({
  search: mockSearch,
}));

vi.stubGlobal('useNuxtApp', () => ({
  $algolia: {
    initIndex: mockInitIndex,
  },
}));

const stateCache: Record<string, any> = {};
vi.stubGlobal('useState', (key: string, init: () => any) => {
  if (!stateCache[key]) {
    stateCache[key] = { value: init ? init() : null };
  }
  return stateCache[key];
});

describe('useMarketData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(stateCache).forEach((key) => delete stateCache[key]);
  });

  it('initializes without throwing and provides default state', () => {
    const { resolving, matchedTitle, matchedIdCode, ambiguousMatches, isGenericFallback } = useMarketData();
    expect(resolving.value).toBe(false);
    expect(matchedTitle.value).toBe('');
    expect(matchedIdCode.value).toBeUndefined();
    expect(ambiguousMatches.value).toEqual([]);
    expect(isGenericFallback.value).toBe(false);
  });

  it('resolves UK identity with exact id bypass', async () => {
    const { resolveUkIdentity, matchedTitle, matchedIdCode } = useMarketData();
    await resolveUkIdentity('Software Engineer', '1234');
    
    expect(matchedTitle.value).toBe('Software Engineer');
    expect(matchedIdCode.value).toBe('1234');
    expect(mockInitIndex).not.toHaveBeenCalled();
  });

  it('resolves UK identity via dictionary search with group', async () => {
    mockSearch.mockResolvedValueOnce({
      hits: [
        { title: 'Developer', group: 'Software Engineering', soc: '2136' }
      ]
    });
    const { resolveUkIdentity, matchedTitle, matchedIdCode } = useMarketData();
    await resolveUkIdentity('Developer (Software Engineering)');

    expect(mockInitIndex).toHaveBeenCalledWith('job_titles');
    expect(matchedTitle.value).toBe('Software Engineering');
    expect(matchedIdCode.value).toBe('2136');
  });

  it('resolves UK identity fallback to generic professional on no hits', async () => {
    mockSearch.mockResolvedValue({ hits: [] }); // For both job_titles and salary_benchmarks
    const { resolveUkIdentity, matchedTitle, isGenericFallback } = useMarketData();
    await resolveUkIdentity('Unknown Job');
    
    expect(isGenericFallback.value).toBe(true);
    expect(matchedTitle.value).toBe('Professional (Generic)');
  });

  it('resolves USA identity with exact id bypass', async () => {
    const { resolveUsaIdentity, matchedTitle, matchedIdCode } = useMarketData();
    await resolveUsaIdentity('Data Scientist', '5678');
    
    expect(matchedTitle.value).toBe('Data Scientist');
    expect(matchedIdCode.value).toBe('5678');
  });

  it('resolves USA identity via master index search', async () => {
    mockSearch.mockResolvedValueOnce({
      hits: [
        { title: 'Data Scientist', id_code: '15-1221' }
      ]
    });
    const { resolveUsaIdentity, matchedTitle, matchedIdCode } = useMarketData();
    await resolveUsaIdentity('Data Scientist');
    
    expect(mockInitIndex).toHaveBeenCalledWith('salary_benchmarks');
    expect(matchedTitle.value).toBe('Data Scientist');
    expect(matchedIdCode.value).toBe('15-1221');
  });

  it('resets identity if title changes in resolveUkIdentity', async () => {
    stateCache['market_matched_id_code'] = { value: '123' };
    stateCache['market_matched_title'] = { value: 'Old Title' };

    const { resolveUkIdentity, matchedTitle, matchedIdCode } = useMarketData();
    await resolveUkIdentity('New Title', '456');

    expect(matchedTitle.value).toBe('New Title');
    expect(matchedIdCode.value).toBe('456');
  });

  it('triggers ambiguous matches for UK search', async () => {
    mockSearch.mockResolvedValueOnce({
      hits: [
        { title: 'Dev', group: 'A' },
        { title: 'Dev', group: 'B' }
      ]
    });
    mockSearch.mockResolvedValueOnce({ hits: [] });

    const { resolveUkIdentity, ambiguousMatches } = useMarketData();
    await resolveUkIdentity('Developer');

    expect(ambiguousMatches.value.length).toBe(2);
  });

  it('falls back to national index for UK when job_titles fails', async () => {
    mockSearch
      .mockResolvedValueOnce({ hits: [] }) // job_titles
      .mockResolvedValueOnce({ hits: [{ title: 'National Title', id_code: 'NAT-1' }] }); // salary_benchmarks

    const { resolveUkIdentity, matchedTitle, matchedIdCode } = useMarketData();
    await resolveUkIdentity('Unknown Job');

    expect(matchedTitle.value).toBe('National Title');
    expect(matchedIdCode.value).toBe('NAT-1');
  });

  it('handles error in resolveUkIdentity gracefully', async () => {
    mockSearch.mockRejectedValueOnce(new Error('Algolia fails'));
    const { resolveUkIdentity, resolving } = useMarketData();
    
    await resolveUkIdentity('Error Job');
    expect(resolving.value).toBe(false);
  });

  it('handles USA generic fallback', async () => {
    mockSearch.mockResolvedValueOnce({ hits: [] });
    const { resolveUsaIdentity, matchedTitle, isGenericFallback } = useMarketData();
    await resolveUsaIdentity('Unknown Job');
    
    expect(isGenericFallback.value).toBe(true);
    expect(matchedTitle.value).toBe('Professional (Generic)');
  });

  it('resets identity if title changes in resolveUsaIdentity', async () => {
    stateCache['market_matched_id_code'] = { value: '123' };
    stateCache['market_matched_title'] = { value: 'Old Title' };

    const { resolveUsaIdentity, matchedTitle, matchedIdCode } = useMarketData();
    await resolveUsaIdentity('New Title', '456');

    expect(matchedTitle.value).toBe('New Title');
    expect(matchedIdCode.value).toBe('456');
  });

  it('handles single title hit without ambiguous matches', async () => {
    mockSearch.mockResolvedValueOnce({
      hits: [
        { title: 'Only Hit', soc: '111' }
      ]
    });
    const { resolveUkIdentity, matchedIdCode, ambiguousMatches } = useMarketData();
    await resolveUkIdentity('Single');
    expect(ambiguousMatches.value.length).toBe(0);
    expect(matchedIdCode.value).toBe('111');
  });

  it('handles multiple title hits with same group without ambiguous matches', async () => {
    mockSearch.mockResolvedValueOnce({
      hits: [
        { title: 'Dev A', group: 'Tech', soc: '111' },
        { title: 'Dev B', group: 'Tech', soc: '222' }
      ]
    });
    const { resolveUkIdentity, matchedIdCode, ambiguousMatches } = useMarketData();
    await resolveUkIdentity('Dev');
    expect(ambiguousMatches.value.length).toBe(0);
    expect(matchedIdCode.value).toBe('111'); // takes first one
  });

  it('sets matchedTitle to title if group is missing', async () => {
    mockSearch.mockResolvedValueOnce({
      hits: [
        { title: 'Fallback Title', soc: '111' }
      ]
    });
    const { resolveUkIdentity, matchedTitle } = useMarketData();
    await resolveUkIdentity('Dev');
    expect(matchedTitle.value).toBe('Fallback Title');
  });

  it('sets matchedTitle to searchTitle if group and title are missing', async () => {
    mockSearch.mockResolvedValueOnce({
      hits: [
        { soc: '111' }
      ]
    });
    const { resolveUkIdentity, matchedTitle } = useMarketData();
    await resolveUkIdentity('Fallback Search');
    expect(matchedTitle.value).toBe('Fallback Search');
  });

  it('handles error in resolveUsaIdentity gracefully', async () => {
    mockSearch.mockRejectedValueOnce(new Error('Algolia fails'));
    const { resolveUsaIdentity, resolving } = useMarketData();
    
    await resolveUsaIdentity('Error Job');
    expect(resolving.value).toBe(false);
  });
});
