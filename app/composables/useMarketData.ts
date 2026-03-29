import type { SearchClient } from 'algoliasearch';

export interface SalaryBenchmark {
  title: string;
  location?: string;
  country?: string;
  salary?: number;
  avg_salary?: number;
  salary_10_pt?: number;
  salary_25_pt?: number;
  salary_75_pt?: number;
  salary_90_pt?: number;
  id_code?: string;
  soc?: string; // Added for UK job_titles dictionary
  group?: string; // Added for UK job_titles dictionary
}

export interface ResolvedJobIdentity {
  title: string;
  id_code?: string; // The master ID we ultimately pass to the data engines
  soc?: string; // UK-specific dictionary ID
  group?: string; // UK-specific job category (e.g., "Software Engineering")
  objectID?: string; // Default Algolia ID
}

export const useMarketData = () => {
  const { $algolia } = useNuxtApp();
  const searchClient = $algolia as SearchClient;

  // Global loading state for the resolution phase
  const resolving = useState<boolean>('market_resolving', () => false);

  // --- IDENTITY STATE ---
  // These are the only variables we need to keep! They define "Who" the user is.
  const matchedTitle = useState<string>('market_matched_title', () => '');
  const matchedIdCode = useState<string | undefined>('market_matched_id_code', () => undefined);
  const ambiguousMatches = useState<any[]>('market_ambiguous_matches', () => []);
  const isGenericFallback = useState<boolean>('market_generic_fallback', () => false);

  const resetIdentity = () => {
    matchedTitle.value = '';
    matchedIdCode.value = undefined;
    ambiguousMatches.value = [];
    isGenericFallback.value = false;
  };

  // ==========================================
  // 🇬🇧 UK SEARCH RESOLVER
  // ==========================================
  const resolveUkIdentity = async (title: string, idCode?: string): Promise<void> => {
    resolving.value = true;
    resetIdentity();

    // 1. EXACT ID BYPASS (Fastest)
    if (idCode) {
      matchedIdCode.value = String(idCode).trim();
      matchedTitle.value = title;
      resolving.value = false;
      return;
    }

    // Clean up title and extract any specified group (e.g., "Developer (Software Engineering)")
    let searchTitle = title.replace(/-/g, ' ');
    let targetGroup = '';
    const groupMatch = searchTitle.match(/^(.*?)\s*\((.*?)\)$/);
    if (groupMatch) {
      searchTitle = groupMatch[1] || '';
      targetGroup = groupMatch[2] || '';
    }

    try {
      const jobTitlesIndex = searchClient.initIndex('job_titles');
      const nationalIndex = searchClient.initIndex('salary_benchmarks');

      // 2. FUZZY SEARCH THE ONS DICTIONARY
      const sanitizedQuery = searchTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const { hits: titleHits } = await jobTitlesIndex.search<any>(sanitizedQuery, {
        filters: `country:UK`,
        hitsPerPage: 10
      });

      let bestTitleMatch;

      if (targetGroup) {
        bestTitleMatch = titleHits.find(
          (h: any) => h.group?.toLowerCase() === targetGroup.toLowerCase()
        );
      }

      if (!bestTitleMatch && titleHits.length > 0) {
        if (titleHits.length > 1) {
          const groups = new Set(titleHits.map((h: any) => h.group).filter(Boolean));
          if (groups.size > 1) {
            ambiguousMatches.value = titleHits; // Trigger your UI modal!
          }
        }
        bestTitleMatch = titleHits[0];
      }

      // 3. SET THE IDENTITY IF FOUND IN DICTIONARY
      if (bestTitleMatch?.soc) {
        matchedIdCode.value = bestTitleMatch.soc;
        matchedTitle.value = bestTitleMatch.group || bestTitleMatch.title || searchTitle;
        return; // Success!
      }

      // 4. FALLBACK: DIRECT BENCHMARK SEARCH
      // If the SOC dictionary lookup completely fails, try searching the benchmarks index directly.
      const { hits } = await nationalIndex.search<any>(searchTitle, {
        filters: `country:UK`,
        hitsPerPage: 1
      });

      if (hits.length > 0) {
        matchedIdCode.value = hits[0].id_code;
        matchedTitle.value = hits[0].title;
      } else {
        // Absolute worst case: Fallback to generic professional
        isGenericFallback.value = true;
        matchedTitle.value = 'Professional (Generic)';
      }
    } catch (error) {
      console.error('Error resolving UK identity:', error);
    } finally {
      resolving.value = false;
    }
  };

  // ==========================================
  // 🇺🇸 USA SEARCH RESOLVER
  // ==========================================
  const resolveUsaIdentity = async (title: string, idCode?: string): Promise<void> => {
    resolving.value = true;
    resetIdentity();

    // 1. EXACT ID BYPASS (Fastest)
    if (idCode) {
      matchedIdCode.value = String(idCode).trim();
      matchedTitle.value = title;
      resolving.value = false;
      return;
    }

    const searchTitle = title.replace(/-/g, ' ');

    try {
      const nationalIndex = searchClient.initIndex('salary_benchmarks');

      // 2. TEXT SEARCH THE MASTER INDEX
      // The USA doesn't have a separate job_titles dictionary in this setup, so we fuzzy search
      // the main benchmark index to find the closest official SOC code.
      const { hits } = await nationalIndex.search<any>(searchTitle, {
        filters: `country:USA`,
        queryLanguages: ['en'],
        removeWordsIfNoResults: 'allOptional',
        hitsPerPage: 1
      });

      if (hits.length > 0) {
        matchedIdCode.value = hits[0].id_code;
        matchedTitle.value = hits[0].title;
      } else {
        // Absolute worst case: Fallback to generic professional
        isGenericFallback.value = true;
        matchedTitle.value = 'Professional (Generic)';
      }
    } catch (error) {
      console.error('Error resolving USA identity:', error);
    } finally {
      resolving.value = false;
    }
  };

  return {
    resolving,
    matchedTitle,
    matchedIdCode,
    ambiguousMatches,
    isGenericFallback,
    resolveUkIdentity,
    resolveUsaIdentity
  };
};
