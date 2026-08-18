import type { ComputedRef, Ref } from 'vue';
import type { RecruiterCard } from '~~/shared/utils/types';

// 1. Explicitly define the shape we expect back from the API
export type RecruiterCardResponse = {
  success: boolean;
  cards: RecruiterCard[];
};

export const useRecruiterCards = async (
  location: Ref<string | undefined | null>,
  matchedLocation: Ref<string | undefined | null>,
  adzunaCategory: Ref<string | undefined | null>,
  prefix: string = 'search'
): Promise<{
  territoryId: ComputedRef<number | null>;
  recruiterCards: ComputedRef<RecruiterCard[]>;
  pendingRecruiters: Ref<boolean>;
}> => {
  const route = useRoute();
  const { allTerritories } = useTerritories();

  const territoryId = computed(() => {
    const targetLocation = location.value || matchedLocation.value;
    if (!targetLocation || targetLocation === 'National') {
      return null;
    }

    const match = allTerritories.find((t) => t.name.toLowerCase() === targetLocation.toLowerCase());
    return match ? match.id : null;
  });

  const { data: recruiterData, pending } = await useAsyncData(
    `recruiters-${prefix}-${route.fullPath}`,
    async () => {
      if (!territoryId.value || !adzunaCategory.value) {
        // This now perfectly matches the RecruiterCardResponse shape
        return { success: true, cards: [] } as RecruiterCardResponse;
      }

      // 2. Cast the $fetch call so TS knows exactly what it returns
      return await $fetch<RecruiterCardResponse>('/api/user/search/recruiter-card', {
        query: { territoryId: territoryId.value, category: adzunaCategory.value }
      });
    },
    { watch: [territoryId, adzunaCategory] }
  );

  const recruiterCards = computed(() => recruiterData.value?.cards || []);

  return { territoryId, recruiterCards, pendingRecruiters: pending };
};
