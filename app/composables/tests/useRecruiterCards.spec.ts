import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRecruiterCards } from '../useRecruiterCards';

const mockRoute = { fullPath: '/test-path' };
const mockTerritories = [{ id: 1, name: 'London' }];

vi.stubGlobal('useRoute', () => mockRoute);
vi.stubGlobal('useTerritories', () => ({ allTerritories: mockTerritories }));

vi.stubGlobal('useAsyncData', async (key: string, fetcher: any) => {

  const result = await fetcher();
  return {
    data: { value: result },
    pending: { value: false }
  };
});

vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ success: true, cards: [{ id: '123' }] }));

vi.stubGlobal('computed', (fn: any) => ({
  get value() {
    return fn();
  }
}));

describe('useRecruiterCards', () => {
  let location: any;
  let matchedLocation: any;
  let adzunaCategory: any;

  beforeEach(() => {
    location = { value: null };
    matchedLocation = { value: null };
    adzunaCategory = { value: null };

    vi.clearAllMocks();
  });

  it('computes territoryId correctly when location matches a territory', async () => {
    location.value = 'London';
    adzunaCategory.value = 'IT';
    const { territoryId } = await useRecruiterCards(location, matchedLocation, adzunaCategory);
    expect(territoryId.value).toBe(1);
  });

  it('computes territoryId as null when location is National', async () => {
    location.value = 'National';
    const { territoryId } = await useRecruiterCards(location, matchedLocation, adzunaCategory);
    expect(territoryId.value).toBeNull();
  });

  it('returns empty cards if territoryId is null', async () => {
    location.value = 'National';
    const { recruiterCards } = await useRecruiterCards(location, matchedLocation, adzunaCategory);
    expect(recruiterCards.value).toEqual([]);
    expect(globalThis.$fetch).not.toHaveBeenCalled();
  });

  it('returns empty cards if adzunaCategory is null', async () => {
    location.value = 'London';
    adzunaCategory.value = null;
    const { recruiterCards } = await useRecruiterCards(location, matchedLocation, adzunaCategory);
    expect(recruiterCards.value).toEqual([]);
    expect(globalThis.$fetch).not.toHaveBeenCalled();
  });

  it('fetches cards when territoryId and adzunaCategory are present', async () => {
    location.value = 'London';
    adzunaCategory.value = 'IT';
    const { recruiterCards } = await useRecruiterCards(location, matchedLocation, adzunaCategory, 'custom-prefix');

    expect(globalThis.$fetch).toHaveBeenCalledWith('/api/user/search/recruiter-card', {
      query: { territoryId: 1, category: 'IT' }
    });
    expect(recruiterCards.value).toEqual([{ id: '123' }]);
  });
});
