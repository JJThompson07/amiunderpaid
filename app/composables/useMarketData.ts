import { ref } from 'vue';
import type { SearchClient } from 'algoliasearch';

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
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Reactive state for the results
  const marketAverage = ref(0);
  const marketHigh = ref(0);
  const marketLow = ref(0);
  const marketLastYear = ref(0);
  const marketDataYear = ref(0);
  const marketPeriod = ref('year');
  const matchedTitle = ref('');
  const matchedLocation = ref('');
  const isGenericFallback = ref(false);
  const ambiguousMatches = ref<any[]>([]);

  // Reset state helper
  const resetData = () => {
    marketAverage.value = 0;
    marketHigh.value = 0;
    marketLow.value = 0;
    marketLastYear.value = 0;
    marketDataYear.value = 0;
    marketPeriod.value = 'year';
    matchedTitle.value = '';
    matchedLocation.value = '';
    isGenericFallback.value = false;
    ambiguousMatches.value = [];
    error.value = null;
  };

  /**
   * Fetches salary data with a 3-step fallback strategy:
   * 1. Exact Match (Title + Location)
   * 2. Country Match (Title + Country)
   * 3. Generic Match (Professional + Country)
   */
  const fetchMarketData = async (
    title: string,
    location: string,
    country: string,
    period: string = 'year'
  ) => {
    loading.value = true;
    resetData();

    // Clean up title if it comes from a URL slug (e.g. "software-engineer" -> "software engineer")
    const searchTitle = title.replace(/-/g, ' ');

    try {
      const nuxtApp = useNuxtApp();
      const $algolia = nuxtApp.$algolia as SearchClient;
      const nationalIndex = $algolia.initIndex('salary_benchmarks');
      const regionalIndex = $algolia.initIndex('regional_salary_benchmarks');
      const jobTitlesIndex = $algolia.initIndex('job_titles');

      let record: SalaryBenchmark | undefined;

      // ** STRATEGY 1: Regional Search (if location provided) **
      if (location && location.length > 2) {
        // Search for Title + Location in Regional Index
        const { hits } = await regionalIndex.search<SalaryBenchmark>(searchTitle, {
          filters: `country:${country} AND period:${period}`,
          queryLanguages: ['en'],
          optionalWords: searchTitle, // Allow fuzzy matching on title if location matches well
          hitsPerPage: 5
        });

        // Client-side filter to ensure location relevance
        // (Algolia search might return a record with correct title but wrong location if ranking allows)
        const locLower = location.toLowerCase();
        const bestRegional = hits.find(h => h.location.toLowerCase().includes(locLower) || locLower.includes(h.location.toLowerCase()));
        
        if (bestRegional) {
          record = bestRegional;
        }
      }

      // ** STRATEGY 2: National Search (Fallback) **
      if (!record) {
        if (country === 'UK') {
          // UK Specific: Use Job Titles Index to find SOC code
          const { hits: titleHits } = await jobTitlesIndex.search<any>(searchTitle, {
            filters: `country:UK`,
            hitsPerPage: 5
          });

          // Handle Ambiguity
          if (titleHits.length > 1) {
            // If multiple groups found (e.g. "Nurse"), store them for the UI modal
            const groups = new Set(titleHits.map(h => h.group).filter(Boolean));
            if (groups.size > 1) {
              ambiguousMatches.value = titleHits;
            }
          }

          const bestTitleMatch = titleHits[0];

          if (bestTitleMatch && bestTitleMatch.soc) {
            // Search National Benchmarks by SOC Code
            const { hits: benchmarkHits } = await nationalIndex.search<SalaryBenchmark>('', {
              filters: `id_code:${bestTitleMatch.soc} AND country:UK AND period:${period}`,
              hitsPerPage: 1
            });
            if (benchmarkHits.length > 0) {
              record = benchmarkHits[0];
            }
          }
        } 
        
        // USA or UK Fallback (Direct Title Match)
        if (!record) {
          const { hits } = await nationalIndex.search<SalaryBenchmark>(searchTitle, {
            filters: `country:${country} AND period:${period}`,
            hitsPerPage: 1
          });
          if (hits.length > 0) {
            record = hits[0];
          }
        }
      }

      // ** STRATEGY 3: Generic Fallback **
      if (!record) {
        console.log('No role match, retrieving generic baseline...');
        isGenericFallback.value = true;
        
        const { hits } = await nationalIndex.search<SalaryBenchmark>('professional', {
          filters: `country:${country} AND period:${period}`,
          hitsPerPage: 1
        });
        if (hits.length > 0) {
          record = hits[0];
        }
      }

      // ** Process Result **
      if (record) {
        marketAverage.value = record.salary;
        marketHigh.value = Math.round(record.salary * 1.3);
        marketLow.value = Math.round(record.salary * 0.75);
        marketDataYear.value = record.year;
        matchedTitle.value = record.title;
        marketPeriod.value = record.period || 'year';
        matchedLocation.value = record.location;

        // ** Fetch Previous Year Data (for trends) **
        const targetIndex = record.location === 'United Kingdom' || record.location === 'USA' 
          ? nationalIndex 
          : regionalIndex;

        const prevYear = record.year - 1;
        
        // We use filters to find the exact same record but for the previous year
        // Note: We search for the title again to ensure we get the right record context
        const { hits: prevHits } = await targetIndex.search<SalaryBenchmark>(record.title, {
          filters: `country:${country} AND year:${prevYear} AND period:${period}`,
          hitsPerPage: 1
        });

        if (prevHits.length > 0 && prevHits[0]?.salary) {
          marketLastYear.value = prevHits[0].salary;
        }
      }
    } catch (e: any) {
      console.error('Error fetching market data:', e);
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    marketAverage,
    marketHigh,
    marketLow,
    marketLastYear,
    marketDataYear,
    marketPeriod,
    matchedTitle,
    matchedLocation,
    isGenericFallback,
    ambiguousMatches,
    fetchMarketData
  };
};
