import { describe, expect, it, vi } from 'vitest';

import { useTerritories } from '../useTerritories';

vi.mock('~~/utils/locations/uk', () => ({
  RECRUITER_TERRITORIES_UK: [{ id: 1, name: 'London' }]
}));

vi.mock('~~/utils/locations/usa', () => ({
  RECRUITER_TERRITORIES_USA: [{ id: 2, name: 'New York' }]
}));

describe('useTerritories', () => {
  it('combines UK and USA territories into allTerritories', () => {
    const { allTerritories, ukTerritories, usaTerritories } = useTerritories();

    expect(ukTerritories).toEqual([{ id: 1, name: 'London' }]);
    expect(usaTerritories).toEqual([{ id: 2, name: 'New York' }]);
    expect(allTerritories).toEqual([
      { id: 1, name: 'London' },
      { id: 2, name: 'New York' }
    ]);
  });

  it('retrieves a territory by ID correctly', () => {
    const { getTerritoryById } = useTerritories();

    expect(getTerritoryById(1)).toEqual({ id: 1, name: 'London' });
    expect(getTerritoryById(2)).toEqual({ id: 2, name: 'New York' });
    expect(getTerritoryById(99)).toBeUndefined();
  });
});
