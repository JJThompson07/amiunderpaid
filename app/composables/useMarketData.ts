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
  const loading = useState<boolean>('market_loading', () => false);

  const marketAverage = useState<number>('market_average', () => 0);
  const marketHigh = useState<number>('market_high', () => 0);
  const marketLow = useState<number>('market_low', () => 0);
  const marketDataYear = useState<number>('market_year', () => 0);
  const marketPeriod = useState<string>('market_period', () => 'year');
  const matchedTitle = useState<string>('market_matched_title', () => '');
  const matchedLocation = useState<string>('market_matched_location', () => '');
  const matchedIdCode = useState<string | undefined>('market_matched_id_code', () => undefined); // NEW
  const isGenericFallback = useState<boolean>('market_generic_fallback', () => false);
  const ambiguousMatches = useState<any[]>('market_ambiguous_matches', () => []);
  const regionalData = useState<SalaryBenchmark | null>('market_regional_data', () => null);

  const resetData = () => {
    marketAverage.value = 0;
    marketHigh.value = 0;
    marketLow.value = 0;
    marketDataYear.value = 0;
    marketPeriod.value = 'year';
    matchedTitle.value = '';
    matchedLocation.value = '';
    matchedIdCode.value = undefined; // NEW
    isGenericFallback.value = false;
    ambiguousMatches.value = [];
    regionalData.value = null;
  };

  const processRecord = async (record: SalaryBenchmark) => {
    marketAverage.value = record.salary;
    marketHigh.value = Math.round(record.salary * 1.3);
    marketLow.value = Math.round(record.salary * 0.75);
    marketDataYear.value = record.year;
    matchedTitle.value = record.title;
    marketPeriod.value = record.period || 'year';
    matchedLocation.value = record.location;
    matchedIdCode.value = record.id_code; // NEW
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

  const fetchUkMarketData = async (
    title: string,
    location: string,
    period: string = 'year',
    idCode?: string
  ) => {
    loading.value = true;
    resetData();

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
      const nationalIndex = $algolia.initIndex('salary_benchmarks');
      const regionalIndex = $algolia.initIndex('regional_salary_benchmarks');
      const jobTitlesIndex = $algolia.initIndex('job_titles');

      let record: SalaryBenchmark | undefined;

      if (idCode) {
        const { hits: benchmarkHits } = await nationalIndex.search<SalaryBenchmark>('', {
          filters: `id_code:${idCode} AND country:UK AND period:${period}`,
          hitsPerPage: 1
        });

        if (benchmarkHits.length > 0) {
          record = benchmarkHits[0];

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

        if (targetGroup) {
          bestTitleMatch = titleHits.find(
            (h: any) => h.group && h.group.toLowerCase() === targetGroup.toLowerCase()
          );
        }

        if (!bestTitleMatch) {
          if (titleHits.length > 1) {
            const groups = new Set(titleHits.map((h: any) => h.group).filter(Boolean));
            if (groups.size > 1) {
              ambiguousMatches.value = titleHits;
            }
          }
          bestTitleMatch = titleHits[0];
        }

        if (bestTitleMatch && bestTitleMatch.soc) {
          const { hits: benchmarkHits } = await nationalIndex.search<SalaryBenchmark>('', {
            filters: `id_code:${bestTitleMatch.soc} AND country:UK AND period:${period}`,
            hitsPerPage: 1
          });
          if (benchmarkHits.length > 0) {
            record = benchmarkHits[0];

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

      if (!record) {
        const { hits } = await nationalIndex.search<SalaryBenchmark>(searchTitle, {
          filters: `country:UK AND period:${period}`,
          hitsPerPage: 1
        });
        if (hits.length > 0) {
          record = hits[0];
        }
      }

      if (!record) {
        record = await fetchGenericFallback(country, period, nationalIndex);
      }

      if (record) {
        await processRecord(record);
      }
    } catch (e: any) {
      console.error('Error fetching UK market data:', e);
    } finally {
      loading.value = false;
    }
  };

  const fetchUSAMarketData = async (
    title: string,
    location: string,
    period: string = 'year',
    idCode?: string
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

      if (idCode) {
        if (location && location.length > 2) {
          const { hits } = await regionalIndex.search<SalaryBenchmark>('', {
            filters: `id_code:${idCode} AND country:USA AND period:${period} AND searchLocation:"${location.toLowerCase()}"`,
            hitsPerPage: 1
          });
          if (hits.length > 0) record = hits[0];
        }

        if (!record) {
          const { hits } = await nationalIndex.search<SalaryBenchmark>('', {
            filters: `id_code:${idCode} AND country:USA AND period:${period}`,
            hitsPerPage: 1
          });
          if (hits.length > 0) record = hits[0];
        }
      }

      if (!record && location && location.length > 2) {
        const { hits } = await regionalIndex.search<SalaryBenchmark>(searchTitle, {
          filters: `country:USA AND period:${period} AND searchLocation:"${location.toLowerCase()}"`,
          queryLanguages: ['en'],
          removeWordsIfNoResults: 'allOptional',
          hitsPerPage: 10
        });

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

      if (!record) {
        record = await fetchGenericFallback(country, period, nationalIndex);
      }

      if (record) {
        await processRecord(record);
      }
    } catch (e: any) {
      console.error('Error fetching market data:', e);
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
    matchedIdCode, // NEW
    isGenericFallback,
    ambiguousMatches,
    regionalData,
    fetchUkMarketData,
    fetchUSAMarketData
  };
};
