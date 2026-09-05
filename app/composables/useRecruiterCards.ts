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
  country?: Ref<string | undefined | null>,
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

    // A searched location's display name (from the ONS-backed autocomplete, e.g.
    // "London") doesn't always equal the recruiter Territory's own name (e.g.
    // "Greater London") -- fall back to each UK territory's `ons_matches` list,
    // which enumerates every ONS place name it covers, mirroring the same
    // ons_matches lookup Territory/Map.vue already uses for the claims map.
    const target = targetLocation.toLowerCase();
    const match = allTerritories.find(
      (t) =>
        t.name.toLowerCase() === target ||
        ('ons_matches' in t && t.ons_matches?.some((ons) => ons.name.toLowerCase() === target))
    );
    return match ? match.id : null;
  });

  const { data: recruiterData, pending } = await useAsyncData(
    `recruiters-${prefix}-${route.fullPath}`,
    async () => {
      // A national recruiter covers every territory in their country, so a
      // search location that fails to resolve to a specific territoryId (an
      // unlisted town, or a 'National'/remote search) must still surface
      // national recruiters as long as we know which country the search is
      // in -- otherwise national coverage silently depends on exact
      // territory-name matching, which it isn't supposed to.
      if ((!territoryId.value && !country?.value) || !adzunaCategory.value) {
        // This now perfectly matches the RecruiterCardResponse shape
        return { success: true, cards: [] } as RecruiterCardResponse;
      }

      // 2. Cast the $fetch call so TS knows exactly what it returns
      return await $fetch<RecruiterCardResponse>('/api/user/search/recruiter-card', {
        query: {
          category: adzunaCategory.value,
          ...(territoryId.value ? { territoryId: territoryId.value } : { country: country?.value })
        }
      });
    },
    { watch: [territoryId, adzunaCategory, ...(country ? [country] : [])] }
  );

  const recruiterCards = computed(() => recruiterData.value?.cards || []);

  return { territoryId, recruiterCards, pendingRecruiters: pending };
};
