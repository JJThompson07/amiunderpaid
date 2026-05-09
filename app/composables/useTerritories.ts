// composables/useTerritories.ts
import { RECRUITER_TERRITORIES_UK } from '~~/utils/locations/uk';
import { RECRUITER_TERRITORIES_USA } from '~~/utils/locations/usa';

export const useTerritories = () => {
  // Make the raw arrays available for your selection map
  const ukTerritories = RECRUITER_TERRITORIES_UK;
  const usaTerritories = RECRUITER_TERRITORIES_USA;

  // Combine them into one master array so the dashboard can search everything at once
  const allTerritories = [...ukTerritories, ...usaTerritories];

  // Helper function to find a territory by its ID
  const getTerritoryById = (id: number) => {
    return allTerritories.find((t) => t.id === id);
  };

  return {
    ukTerritories,
    usaTerritories,
    allTerritories,
    getTerritoryById
  };
};
