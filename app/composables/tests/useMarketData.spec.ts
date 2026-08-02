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

vi.stubGlobal('useState', (key: string, init: () => any) => {
  return { value: init ? init() : null };
});

describe('useMarketData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
