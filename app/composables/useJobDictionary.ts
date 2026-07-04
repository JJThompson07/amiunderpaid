import type { SearchClient } from 'algoliasearch';

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

// 1. Define your excellent string literal types
export type UseJobDictionaryType = 'exact' | 'ambiguous' | 'unmapped' | 'error';

// 2. Define the STRICT shape for each specific outcome
export interface JobMatchExact {
  type: 'exact';
  id: string; // Guaranteed to be a string
  group_name: string; // Guaranteed to exist (no '?')
}

export interface JobMatchAmbiguous {
  type: 'ambiguous';
  id: null;
  options: { id_code: string; group_name: string }[]; // Guaranteed to exist
}

export interface JobMatchUnmapped {
  type: 'unmapped';
  id: null;
}

export interface JobMatchError {
  type: 'error';
  id: null;
  message: string; // You can pass an error message back to the UI!
}

// 3. Create the Union using your types
export type JobDictionaryResult =
  | JobMatchExact
  | JobMatchAmbiguous
  | JobMatchUnmapped
  | JobMatchError;

export const useJobDictionary = (): {
  resolveJobId: (searchTerm: string) => Promise<JobDictionaryResult>;
} => {
  const { currentCountry } = useRegion();

  const resolveJobId = async (searchTerm: string): Promise<JobDictionaryResult> => {
    const country = currentCountry.value;
    const cleanTitle = searchTerm.toLowerCase().trim();

    try {
      // --- STEP 1: Check Firestore (Exact Match) ---
      const { matches } = await $fetch<{ matches: MasterMatch[] }>('/api/engine/match-title', {
        query: { title: cleanTitle, country }
      });

      if (matches?.length === 1 && matches[0]) {
        return {
          type: 'exact' as const,
          id: matches[0].id_code,
          group_name: matches[0].group_name
        };
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
        removeWordsIfNoResults: 'allOptional',
        hitsPerPage: 5
      });

      if (hits.length > 0 && hits[0]) {
        const topHit = hits[0];
        const query = cleanTitle.toLowerCase().trim();

        // 1. Did they exactly type the official Group Name?
        const isExactGroup = topHit.group_name.toLowerCase() === query;

        // 2. Did they exactly type one of your mapped Synonyms?
        const isExactSynonym = topHit.titles?.some((title) => title.toLowerCase() === query);

        // If YES to either, bypass the modal entirely and route them instantly!
        if (isExactGroup || isExactSynonym) {
          return {
            type: 'exact' as const,
            id: topHit.gov_id,
            group_name: topHit.group_name
          };
        }

        // If NO, it means Algolia found a partial/fuzzy match (e.g. they typed "React Web Expert"
        // and Algolia matched it to the "React Developer" chunk).
        // ONLY THEN do we trigger the Ambiguity Modal to double-check!
        return {
          type: 'ambiguous' as const,
          id: null,
          options: hits.map((hit) => ({
            id_code: hit.gov_id,
            group_name: hit.group_name
          }))
        };
      }

      // Fallback if 0 hits
      return { type: 'unmapped' as const, id: null };
    } catch {
      return {
        type: 'error' as const,
        id: null,
        message: 'An error occurred while resolving the job ID.'
      };
    }
  };

  return { resolveJobId };
};
