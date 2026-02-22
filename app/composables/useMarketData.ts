import type { SearchClient, SearchIndex } from 'algoliasearch';

export interface SalaryBenchmark {
  title: string;
  location: string;
  country: string;
  salary: number;
  year: number;
  period?: string;
  id_code?: string;
}

export const useMarketData = () => {
  // Global loading state for market data fetches
  const loading = useState<boolean>('market_loading', () => false);

  // --- Reactive State for Results ---
  // We use Nuxt's useState to ensure the data is preserved across SSR and client hydration
  const marketAverage = useState<number>('market_average', () => 0);
  const marketHigh = useState<number>('market_high', () => 0);
  const marketLow = useState<number>('market_low', () => 0);
  const marketDataYear = useState<number>('market_year', () => 0);
  const marketPeriod = useState<string>('market_period', () => 'year');
  const matchedTitle = useState<string>('market_matched_title', () => '');
  const matchedLocation = useState<string>('market_matched_location', () => '');

  // Stores the ID code (e.g. SOC code) of the matched benchmark.
  // This is critical for saving automatic matches back to the Adzuna cache.
  const matchedIdCode = useState<string | undefined>('market_matched_id_code', () => undefined);

  // Flag indicating if we failed to find a specific role and fell back to the generic "Professional" benchmark
  const isGenericFallback = useState<boolean>('market_generic_fallback', () => false);

  // Stores a list of potential matches if the search term is too broad (e.g., returns multiple different SOC groups)
  const ambiguousMatches = useState<any[]>('market_ambiguous_matches', () => []);

  // Stores localized salary data if the user searched for a specific region/city
  const regionalData = useState<SalaryBenchmark | null>('market_regional_data', () => null);

  // --- Internal Helpers ---

  /**
   * Resets all reactive state variables to their default values.
   * Called at the start of every new fetch to prevent stale data.
   */
  const resetData = () => {
    marketAverage.value = 0;
    marketHigh.value = 0;
    marketLow.value = 0;
    marketDataYear.value = 0;
    marketPeriod.value = 'year';
    matchedTitle.value = '';
    matchedLocation.value = '';
    matchedIdCode.value = undefined;
    isGenericFallback.value = false;
    ambiguousMatches.value = [];
    regionalData.value = null;
  };

  /**
   * Hydrates the reactive state with the data from a successful Algolia benchmark match.
   */
  const processRecord = async (record: SalaryBenchmark) => {
    marketAverage.value = record.salary;
    // Calculate high/low bounds (currently 30% above and 25% below the mean)
    marketHigh.value = Math.round(record.salary * 1.3);
    marketLow.value = Math.round(record.salary * 0.75);
    marketDataYear.value = record.year;
    matchedTitle.value = record.title;
    marketPeriod.value = record.period || 'year';
    matchedLocation.value = record.location;
    matchedIdCode.value = record.id_code; // Save the ID code so the frontend can cache it
  };

  /**
   * Fetches the generic "Professional" baseline salary for a given country.
   * Used as an absolute last resort if no specific job title matches are found.
   */
  const fetchGenericFallback = async (
    country: string,
    period: string,
    nationalIndex: SearchIndex
  ) => {
    isGenericFallback.value = true;
    const { hits } = await nationalIndex.search('professional', {
      filters: `country:${country} AND period:${period}`,
      hitsPerPage: 1
    });
    return hits.length > 0 ? (hits[0] as unknown as SalaryBenchmark) : undefined;
  };

  // ==========================================
  // UK SPECIFIC LOGIC
  // ==========================================
  const fetchUkMarketData = async (
    title: string,
    location: string,
    period: string = 'year',
    idCode?: string // Optional ID code from URL or Cache
  ) => {
    loading.value = true;
    resetData();

    // Clean up title and extract any specified group (e.g., "Developer (Software Engineering)")
    let searchTitle = title.replace(/-/g, ' ');
    let targetGroup = '';
    const groupMatch = searchTitle.match(/^(.*?)\s*\((.*?)\)$/);
    if (groupMatch) {
      searchTitle = groupMatch[1] || '';
      targetGroup = groupMatch[2] || '';
    }

    const country = 'UK';

    try {
      const nuxtApp = useNuxtApp();
      const $algolia = nuxtApp.$algolia as SearchClient;

      // Initialize the three UK indices
      const nationalIndex = $algolia.initIndex('salary_benchmarks');
      const regionalIndex = $algolia.initIndex('regional_salary_benchmarks');
      const jobTitlesIndex = $algolia.initIndex('job_titles');

      let record: SalaryBenchmark | undefined;

      // STEP 1: EXACT ID LOOKUP
      // If we have a cached ID or a manual override, bypass fuzzy search entirely.
      if (idCode) {
        const { hits: benchmarkHits } = await nationalIndex.search<SalaryBenchmark>('', {
          filters: `id_code:${idCode} AND country:UK AND period:${period}`,
          hitsPerPage: 1
        });

        if (benchmarkHits.length > 0) {
          record = benchmarkHits[0];

          // If a location is provided, try to find the regional variation of this exact ID
          if (location && location.length > 2) {
            const { hits: regionalHits } = await regionalIndex.search<SalaryBenchmark>('', {
              filters: `country:UK AND period:${period} AND searchLocation:"${location.toLowerCase()}"`,
              hitsPerPage: 10
            });

            // Ensure the region actually matches the user's location string
            const locLower = location.toLowerCase();
            const bestRegional = regionalHits.find(
              (h) =>
                h.location.toLowerCase().includes(locLower) ||
                locLower.includes(h.location.toLowerCase())
            );

            if (bestRegional) regionalData.value = bestRegional;
          }
        }
      }

      // STEP 2: SOC CODE TEXT LOOKUP (Fuzzy Search)
      // If no exact ID was provided, search the `job_titles` index to find the correct SOC code.
      if (!record) {
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

        // If the user search string included a specific group, force that match
        if (targetGroup) {
          bestTitleMatch = titleHits.find(
            (h: any) => h.group && h.group.toLowerCase() === targetGroup.toLowerCase()
          );
        }

        // If no group was forced, check if the search is ambiguous
        if (!bestTitleMatch) {
          if (titleHits.length > 1) {
            const groups = new Set(titleHits.map((h: any) => h.group).filter(Boolean));
            // If the search yields multiple DIFFERENT job categories, flag it for the user to resolve
            if (groups.size > 1) {
              ambiguousMatches.value = titleHits;
            }
          }
          // Default to the top match Algolia suggests
          bestTitleMatch = titleHits[0];
        }

        // Once we have a job title match, look up its actual salary benchmark using its SOC code
        if (bestTitleMatch && bestTitleMatch.soc) {
          const { hits: benchmarkHits } = await nationalIndex.search<SalaryBenchmark>('', {
            filters: `id_code:${bestTitleMatch.soc} AND country:UK AND period:${period}`,
            hitsPerPage: 1
          });

          if (benchmarkHits.length > 0) {
            record = benchmarkHits[0];

            // Grab the regional equivalent if a location was requested
            if (location && location.length > 2) {
              const { hits: regionalHits } = await regionalIndex.search<SalaryBenchmark>('', {
                filters: `country:UK AND period:${period} AND searchLocation:"${location.toLowerCase()}"`,
                hitsPerPage: 10
              });

              const locLower = location.toLowerCase();
              const bestRegional = regionalHits.find(
                (h) =>
                  h.location.toLowerCase().includes(locLower) ||
                  locLower.includes(h.location.toLowerCase())
              );
              if (bestRegional) regionalData.value = bestRegional;
            }
          }
        }
      }

      // STEP 3: DIRECT TITLE MATCH FALLBACK
      // If the SOC dictionary lookup completely fails, try searching the benchmarks index directly.
      if (!record) {
        const { hits } = await nationalIndex.search<SalaryBenchmark>(searchTitle, {
          filters: `country:UK AND period:${period}`,
          hitsPerPage: 1
        });
        if (hits.length > 0) {
          record = hits[0];
        }
      }

      // STEP 4: GENERIC FALLBACK
      // If everything above failed, give them the baseline UK Professional average.
      if (!record) {
        record = await fetchGenericFallback(country, period, nationalIndex);
      }

      // Hydrate the reactive state with whatever record we ended up with
      if (record) {
        await processRecord(record);
      }
    } catch (e: any) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching UK market data',
        cause: e
      });
    } finally {
      loading.value = false;
    }
  };

  // ==========================================
  // USA SPECIFIC LOGIC
  // ==========================================
  const fetchUSAMarketData = async (
    title: string,
    location: string,
    period: string = 'year',
    idCode?: string // Optional ID code from URL or Cache
  ) => {
    loading.value = true;
    resetData();

    const searchTitle = title.replace(/-/g, ' ');
    const country = 'USA';

    try {
      const { $algolia } = useNuxtApp();
      const nationalIndex = ($algolia as SearchClient).initIndex('salary_benchmarks');
      const regionalIndex = ($algolia as SearchClient).initIndex('regional_salary_benchmarks');

      let record: SalaryBenchmark | undefined;

      // STEP 1: EXACT ID LOOKUP
      // If we have a cached ID or a manual override, bypass fuzzy search entirely.
      if (idCode) {
        // First try to find a regional benchmark for this exact ID
        if (location && location.length > 2) {
          const { hits } = await regionalIndex.search<SalaryBenchmark>('', {
            filters: `id_code:${idCode} AND country:USA AND period:${period} AND searchLocation:"${location.toLowerCase()}"`,
            hitsPerPage: 1
          });
          if (hits.length > 0) record = hits[0];
        }

        // If no regional match (or no location provided), fall back to the National benchmark for this ID
        if (!record) {
          const { hits } = await nationalIndex.search<SalaryBenchmark>('', {
            filters: `id_code:${idCode} AND country:USA AND period:${period}`,
            hitsPerPage: 1
          });
          if (hits.length > 0) record = hits[0];
        }
      }

      // STEP 2: REGIONAL TEXT SEARCH (Fuzzy Search)
      // If no exact ID was provided, and the user provided a location, search the regional index
      if (!record && location && location.length > 2) {
        const { hits } = await regionalIndex.search<SalaryBenchmark>(searchTitle, {
          filters: `country:USA AND period:${period} AND searchLocation:"${location.toLowerCase()}"`,
          queryLanguages: ['en'],
          removeWordsIfNoResults: 'allOptional', // Drops words from the query one by one if it's too specific
          hitsPerPage: 10
        });

        // Ensure the region actually matches the user's location string
        const locLower = location.toLowerCase();
        const bestRegional = hits.find(
          (h) =>
            h.location.toLowerCase().includes(locLower) ||
            locLower.includes(h.location.toLowerCase())
        );

        if (bestRegional) {
          record = bestRegional;
        }
      }

      // STEP 3: NATIONAL TEXT SEARCH FALLBACK
      // If the regional search failed (or wasn't requested), search the broad national index
      if (!record) {
        const { hits } = await nationalIndex.search<SalaryBenchmark>(searchTitle, {
          filters: `country:USA AND period:${period}`,
          queryLanguages: ['en'],
          removeWordsIfNoResults: 'allOptional',
          hitsPerPage: 10
        });
        if (hits.length > 0) {
          record = hits[0];
        }
      }

      // STEP 4: GENERIC FALLBACK
      // If everything above failed, give them the baseline USA Professional average.
      if (!record) {
        record = await fetchGenericFallback(country, period, nationalIndex);
      }

      // Hydrate the reactive state with whatever record we ended up with
      if (record) {
        await processRecord(record);
      }
    } catch (e: any) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching USA market data',
        cause: e
      });
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    marketAverage,
    marketHigh,
    marketLow,
    marketDataYear,
    marketPeriod,
    matchedTitle,
    matchedLocation,
    matchedIdCode, // Exposed so UI can trigger background cache updates
    isGenericFallback,
    ambiguousMatches,
    regionalData,
    fetchUkMarketData,
    fetchUSAMarketData
  };
};
