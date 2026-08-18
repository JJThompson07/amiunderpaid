import type { Ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRecruiterCards } from '../useRecruiterCards';

const mockRef = (value: string | null): Ref<string | null> =>
  ({ value }) as unknown as Ref<string | null>;

const mockRoute = { fullPath: '/test-path' };
const mockTerritories = [{ id: 1, name: 'London' }];

vi.stubGlobal('useRoute', () => mockRoute);
vi.stubGlobal('useTerritories', () => ({ allTerritories: mockTerritories }));

vi.stubGlobal('useAsyncData', async (key: string, fetcher: () => Promise<unknown>) => {
  const result = await fetcher();
  return {
    data: { value: result },
    pending: { value: false }
  };
});

const fetchMock = vi.fn().mockResolvedValue({ success: true, cards: [{ id: '123' }] });
vi.stubGlobal('$fetch', fetchMock);

vi.stubGlobal('computed', <T>(fn: () => T) => ({
  get value(): T {
    return fn();
  }
}));

describe('useRecruiterCards', () => {
  let location: Ref<string | null>;
  let matchedLocation: Ref<string | null>;
  let adzunaCategory: Ref<string | null>;

  beforeEach(() => {
    location = mockRef(null);
    matchedLocation = mockRef(null);
    adzunaCategory = mockRef(null);

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
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns empty cards if adzunaCategory is null', async () => {
    location.value = 'London';
    adzunaCategory.value = null;
    const { recruiterCards } = await useRecruiterCards(location, matchedLocation, adzunaCategory);
    expect(recruiterCards.value).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches cards when territoryId and adzunaCategory are present', async () => {
    location.value = 'London';
    adzunaCategory.value = 'IT';
    const { recruiterCards } = await useRecruiterCards(
      location,
      matchedLocation,
      adzunaCategory,
      'custom-prefix'
    );

    expect(fetchMock).toHaveBeenCalledWith('/api/user/search/recruiter-card', {
      query: { territoryId: 1, category: 'IT' }
    });
    expect(recruiterCards.value).toEqual([{ id: '123' }]);
  });
});
