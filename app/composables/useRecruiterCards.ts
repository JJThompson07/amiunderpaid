import type { Ref } from 'vue';

// 1. Explicitly define the shape we expect back from the API
export interface RecruiterCardResponse {
  success: boolean;
  cards: any[]; // You can swap `any` for a specific Card interface if you have one!
}

export const useRecruiterCards = async (
  location: Ref<string | undefined | null>,
  matchedLocation: Ref<string | undefined | null>,
  adzunaCategory: Ref<string | undefined | null>,
  prefix: string = 'search'
) => {
  const route = useRoute();
  const { allTerritories } = useTerritories();

  const territoryId = computed(() => {
    const targetLocation = location.value || matchedLocation.value;
    if (!targetLocation || targetLocation === 'National') return null;

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
