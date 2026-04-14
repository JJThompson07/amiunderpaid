// composables/useTerritoryClaims.ts
import { computed } from 'vue';
import type { Ref } from 'vue';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection } from 'vuefire';

export const useTerritoryClaims = (territoryIds: Ref<number[]>) => {
  const db = useFirestore();
  const { userProfile } = useUserProfile();

  // 1. Build the query based on the array of selected IDs
  const claimsQuery = computed(() => {
    if (!territoryIds.value || territoryIds.value.length === 0) return null;

    // Safety limit: Firestore 'in' queries max out at 10 items.
    const safeIds = territoryIds.value.slice(0, 10);

    return query(collection(db, 'territory_claims'), where('territoryId', 'in', safeIds));
  });

  // 2. Fetch the live collection
  const { data: claimsData, pending: loadingClaims } = useCollection(claimsQuery);

  // 3. Format the data for the Matrix
  const globalTakenMonths = computed(() => {
    if (!claimsData.value || !userProfile.value) return {};

    const locks: Record<string, string[]> = {};

    for (const doc of claimsData.value) {
      // Create the exact row ID string the Matrix is expecting
      const rowId = `${doc.territoryId}|${doc.categoryValue}`;
      const takenByOthers: string[] = [];

      if (doc.takenExclusiveMonths) {
        for (const [month, ownerId] of Object.entries(doc.takenExclusiveMonths)) {
          // Lock the month ONLY if the owner is not the current user
          if (ownerId !== userProfile.value.uid) {
            takenByOthers.push(month);
          }
        }
      }

      if (takenByOthers.length > 0) {
        locks[rowId] = takenByOthers;
      }
    }

    return locks;
  });

  return {
    globalTakenMonths,
    loadingClaims,
    claimsData
  };
};
