// composables/useTerritories.ts
import type { Territory } from '~~/utils/locations/uk';
import { RECRUITER_TERRITORIES_UK } from '~~/utils/locations/uk';
import type { USATerritory } from '~~/utils/locations/usa';
import { RECRUITER_TERRITORIES_USA } from '~~/utils/locations/usa';

type UseTerritoriesReturn = {
  ukTerritories: Territory[];
  usaTerritories: USATerritory[];
  allTerritories: (Territory | USATerritory)[];
  getTerritoryById: (id: number) => Territory | USATerritory | undefined;
};

export const useTerritories = (): UseTerritoriesReturn => {
  // Make the raw arrays available for your selection map
  const ukTerritories = RECRUITER_TERRITORIES_UK;
  const usaTerritories = RECRUITER_TERRITORIES_USA;

  // Combine them into one master array so the dashboard can search everything at once
  const allTerritories: (Territory | USATerritory)[] = [...ukTerritories, ...usaTerritories];

  // Helper function to find a territory by its ID
  const getTerritoryById = (id: number): Territory | USATerritory | undefined => {
    return allTerritories.find((t) => t.id === id);
  };

  return {
    ukTerritories,
    usaTerritories,
    allTerritories,
    getTerritoryById
  };
};
