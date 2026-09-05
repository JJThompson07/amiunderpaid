import { FieldValue } from 'firebase-admin/firestore';
import type { TerritoryClaim } from '~~/shared/utils/types';

export type ClaimDocUpdates = {
  takenExclusiveMonths?: Record<string, string>;
  basicOwners?: FieldValue;
  territoryId?: number;
  categoryValue?: string;
  updatedAt?: string;
};

export type ClaimWrite = {
  claimDocId: string;
  updates: ClaimDocUpdates;
};

export type FulfillmentComputation =
  | { conflict: false; updatedTerritories: TerritoryClaim[]; claimWrites: ClaimWrite[] }
  | { conflict: true; error: Error };

// Pure, no-Firestore-I/O core of territory fulfilment: given the recruiter's
// current territories, the cart being fulfilled, and the pre-fetched claim
// doc data for every doc the cart touches, computes the resulting territory
// list and the claim-doc writes needed -- or reports the first exclusive-month
// conflict encountered. Shared by the Stripe webhook (Checkout path) and the
// existing-subscription checkout path so both enforce identical conflict
// detection.
export function computeTerritoryFulfillment(
  existingTerritories: TerritoryClaim[],
  purchasedItems: TerritoryClaim[],
  claimDocsData: Record<string, FirebaseFirestore.DocumentData | null>,
  userId: string
): FulfillmentComputation {
  const updatedTerritories = [...existingTerritories];
  const claimWrites: ClaimWrite[] = [];

  for (const item of purchasedItems) {
    // --- UPDATE 1: THE USER'S PROFILE DATA ---
    const existingIndex = updatedTerritories.findIndex(
      (tItem) =>
        tItem.territoryId === item.territoryId && tItem.categoryValue === item.categoryValue
    );

    if (existingIndex > -1) {
      // Upgrade existing territory
      const existingTerritory = updatedTerritories[existingIndex]!;
      existingTerritory.isBasic = item.isBasic || existingTerritory.isBasic;
      const combinedMonths = new Set([
        ...(existingTerritory.exclusiveMonths || []),
        ...item.exclusiveMonths
      ]);
      existingTerritory.exclusiveMonths = Array.from(combinedMonths);
    } else {
      // Brand new territory
      updatedTerritories.push(item);
    }

    // --- UPDATE 2: THE GLOBAL LOCK & BASIC OWNERS ---
    const claimDocId = `${item.territoryId}_${item.categoryValue}`;
    const existingClaimData = claimDocsData[claimDocId] || {};
    const updates: ClaimDocUpdates = {};

    if (item.exclusiveMonths && item.exclusiveMonths.length > 0) {
      const takenMonths = existingClaimData.takenExclusiveMonths || {};
      const newExclusiveLocks: Record<string, string> = {};
      for (const month of item.exclusiveMonths) {
        if (takenMonths[month] && takenMonths[month] !== userId) {
          return {
            conflict: true,
            error: new Error(`Territory ${claimDocId} is already taken for month ${month}`)
          };
        }
        newExclusiveLocks[month] = userId;
      }
      updates.takenExclusiveMonths = newExclusiveLocks;
    }

    if (item.isBasic) {
      updates.basicOwners = FieldValue.arrayUnion(userId);
    }

    if (Object.keys(updates).length > 0) {
      updates.territoryId = item.territoryId;
      updates.categoryValue = item.categoryValue;
      updates.updatedAt = new Date().toISOString();
      claimWrites.push({ claimDocId, updates });
    }
  }

  return { conflict: false, updatedTerritories, claimWrites };
}
