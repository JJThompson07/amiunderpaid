import type { SearchClient } from 'algoliasearch';
import { useRegion } from './useRegion'; // Assuming you use this to get currentCountry

interface JobGroupHit {
  objectID: string;
  gov_id: string;
  group_name: string;
  titles?: string[];
}

interface MasterMatch {
  id_code: string;
  group_name: string;
}

export const useJobDictionary = () => {
  const { currentCountry } = useRegion();

  const resolveJobId = async (searchTerm: string) => {
    const country = currentCountry.value;
    const cleanTitle = searchTerm.toLowerCase().trim();

    try {
      // --- STEP 1: Check Firestore (Exact Match) ---
      const { matches } = await $fetch<{ matches: MasterMatch[] }>('/api/engine/match-title', {
        query: { title: cleanTitle, country }
      });

      if (matches?.length === 1 && matches[0]) {
        return { type: 'exact' as const, id: matches[0].id_code, options: [] };
      }

      if (matches && matches.length > 1) {
        return {
          type: 'ambiguous' as const,
          id: null,
          options: matches.map((m) => ({ id_code: m.id_code, group_name: m.group_name }))
        };
      }

      // --- STEP 2: Fallback to Algolia (Fuzzy Match) ---
      // Implemented EXACTLY like your useJobAutocomplete.ts
      const { $algolia } = useNuxtApp();
      const indexName = country === 'USA' ? 'usa_job_groups' : 'uk_job_groups';
      const index = ($algolia as SearchClient).initIndex(indexName);

      const { hits } = await index.search<JobGroupHit>(cleanTitle, {
        hitsPerPage: 5,
        removeWordsIfNoResults: 'allOptional'
      });

      if (hits.length > 0) {
        return {
          type: 'ambiguous' as const,
          id: null,
          options: hits.map((hit) => ({
            id_code: hit.gov_id,
            group_name: hit.group_name
          }))
        };
      }

      return { type: 'unknown' as const, id: null, options: [] };
    } catch (error) {
      console.error('Dictionary resolution failed:', error);
      return { type: 'error' as const, id: null, options: [] };
    }
  };

  return { resolveJobId };
};
