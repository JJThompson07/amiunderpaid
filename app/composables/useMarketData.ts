import { ref } from 'vue';
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
  const regionalData = ref<SalaryBenchmark | null>(null);

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
    regionalData.value = null;
    error.value = null;
  };

  // ** Internal Helpers **

  const processRecord = async (
    record: SalaryBenchmark,
    country: string,
    period: string,
    nationalIndex: any,
    regionalIndex: any
  ) => {
    marketAverage.value = record.salary;
    marketHigh.value = Math.round(record.salary * 1.3);
    marketLow.value = Math.round(record.salary * 0.75);
    marketDataYear.value = record.year;
    matchedTitle.value = record.title;
    marketPeriod.value = record.period || 'year';
    matchedLocation.value = record.location;

    // ** Fetch Previous Year Data (for trends) **
    const targetIndex =
      record.location === 'United Kingdom' || record.location === 'USA'
        ? nationalIndex
        : regionalIndex;

    const prevYear = record.year - 1;

    const { hits: prevHits } = await targetIndex.search(record.title, {
      filters: `country:${country} AND year:${prevYear} AND period:${period}`,
      hitsPerPage: 1
    });

    if (prevHits.length > 0 && prevHits[0]?.salary) {
      marketLastYear.value = prevHits[0].salary;
    }
  };

  const fetchGenericFallback = async (
    country: string,
    period: string,
    nationalIndex: SearchIndex
  ) => {
    console.log('No role match, retrieving generic baseline...');
    isGenericFallback.value = true;
    const { hits } = await nationalIndex.search('professional', {
      filters: `country:${country} AND period:${period}`,
      hitsPerPage: 1
    });
    return hits.length > 0 ? (hits[0] as unknown as SalaryBenchmark) : undefined;
  };

  // ** UK Specific Logic **
  const fetchUkMarketData = async (title: string, location: string, period: string = 'year') => {
    loading.value = true;
    resetData();

    // Clean up title if it comes from a URL slug (e.g. "software-engineer" -> "software engineer")
    const searchTitle = title.replace(/-/g, ' ');
    const country = 'UK';

    try {
      const nuxtApp = useNuxtApp();
      const $algolia = nuxtApp.$algolia as SearchClient;
      const nationalIndex = $algolia.initIndex('salary_benchmarks');
      const regionalIndex = $algolia.initIndex('regional_salary_benchmarks');
      const jobTitlesIndex = $algolia.initIndex('job_titles');

      let record: SalaryBenchmark | undefined;

      // 1. SOC Code Lookup (UK Strategy)
      const { hits: titleHits } = await jobTitlesIndex.search<any>(searchTitle, {
        filters: `country:UK`,
        hitsPerPage: 5
      });

      // Handle Ambiguity
      if (titleHits.length > 1) {
        const groups = new Set(titleHits.map((h: any) => h.group).filter(Boolean));
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

          // ** UK Regional Fetch (Secondary) **
          if (location && location.length > 2) {
            const { hits: regionalHits } = await regionalIndex.search<SalaryBenchmark>(
              '', // UK Regional data is aggregate (Title = 'All'), so we don't search by job title.
              {
                filters: `country:UK AND period:${period} AND searchLocation:"${location.toLowerCase()}"`,
                hitsPerPage: 10
              }
            );

            console.log('Regional Hits:', regionalHits);

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

      // 2. Direct Title Match Fallback
      if (!record) {
        const { hits } = await nationalIndex.search<SalaryBenchmark>(searchTitle, {
          filters: `country:UK AND period:${period}`,
          hitsPerPage: 1
        });
        if (hits.length > 0) {
          record = hits[0];
        }
      }

      // 3. Generic Fallback
      if (!record) {
        record = await fetchGenericFallback(country, period, nationalIndex);
      }

      if (record) {
        await processRecord(record, country, period, nationalIndex, regionalIndex);
      }
    } catch (e: any) {
      console.error('Error fetching UK market data:', e);
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  // ** USA Specific Logic **
  const fetchUSAMarketData = async (title: string, location: string, period: string = 'year') => {
    loading.value = true;
    resetData();

    const searchTitle = title.replace(/-/g, ' ');
    const country = 'USA';

    try {
      const { $algolia } = useNuxtApp();
      const nationalIndex = ($algolia as SearchClient).initIndex('salary_benchmarks');
      const regionalIndex = ($algolia as SearchClient).initIndex('regional_salary_benchmarks');

      let record: SalaryBenchmark | undefined;

      // 1. Regional Search (Primary for USA)
      if (location && location.length > 2) {
        // Search for Title + Location in Regional Index
        const { hits } = await regionalIndex.search<SalaryBenchmark>(searchTitle, {
          filters: `country:USA AND period:${period} AND searchLocation:"${location.toLowerCase()}"`,
          queryLanguages: ['en'],
          optionalWords: searchTitle, // Allow fuzzy matching on title if location matches well
          hitsPerPage: 10
        });

        console.log(hits);

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

      // 2. National Fallback
      if (!record) {
        const { hits } = await nationalIndex.search<SalaryBenchmark>(searchTitle, {
          filters: `country:USA AND period:${period}`,
          hitsPerPage: 1
        });
        if (hits.length > 0) {
          record = hits[0];
        }
      }

      // 3. Generic Fallback
      if (!record) {
        record = await fetchGenericFallback(country, period, nationalIndex);
      }

      if (record) {
        await processRecord(record, country, period, nationalIndex, regionalIndex);
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
    regionalData,
    fetchUkMarketData,
    fetchUSAMarketData
  };
};
