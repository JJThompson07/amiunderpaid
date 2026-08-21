import type { SearchClient } from 'algoliasearch';
import type { Ref } from 'vue';
import type { PercentileData } from '~~/shared/utils/types';

// Raw shape of a benchmark record as stored in the Algolia `salary_benchmarks` /
// `regional_salary_benchmarks` indices.
type AlgoliaBenchmarkHit = {
  title?: string;
  avg_salary?: number;
  salary?: number;
  salary_10_pt?: number;
  salary_25_pt?: number;
  salary_75_pt?: number;
  salary_90_pt?: number;
  searchLocation?: string;
};

export type MacroBaselines = {
  macroNationalData: PercentileData;
  userRegionalData: PercentileData | null;
  allRegionalData: Record<string, PercentileData>;
  nationalMedianAllRoles: number;
  regionalMedianAllRoles: number | null;
};

export const useMacroData = (): {
  fetching: Ref<boolean>;
  fetchMacroBaselines: (country: string, userLocation?: string | null) => Promise<MacroBaselines>;
} => {
  const { $algolia } = useNuxtApp();
  const fetching = ref(false);

  const NATIONAL_INDEX_NAME = 'salary_benchmarks';
  const REGIONAL_INDEX_NAME = 'regional_salary_benchmarks';

  const fetchMacroBaselines = async (
    country: string,
    userLocation?: string | null
  ): Promise<MacroBaselines> => {
    fetching.value = true;
    const client = $algolia as SearchClient;

    const nationalIndex = client.initIndex(NATIONAL_INDEX_NAME);
    const regionalIndex = client.initIndex(REGIONAL_INDEX_NAME);

    try {
      // ==========================================
      // 1. BUILD NATIONAL QUERY
      // ==========================================
      let nationalFilter = '';
      if (country === 'USA') {
        nationalFilter = `country:USA AND id_code:"00-0000"`;
      } else {
        nationalFilter = `country:UK AND searchTitle:"all employees" AND searchLocation:"united kingdom"`;
      }
      const nationalQuery = nationalIndex.search<AlgoliaBenchmarkHit>('', {
        filters: nationalFilter,
        hitsPerPage: 1
      });

      // ==========================================
      // 2. BUILD "ALL REGIONS" QUERY
      // ==========================================
      let regionalFilter = '';
      if (country === 'USA') {
        regionalFilter = `country:USA AND id_code:"00-0000"`;
      } else {
        // Fetch ALL regions by excluding the national "all employees" record.
        // Keep hitsPerPage in sync with useMicroData.ts's regional query —
        // utils/locations/uk.ts carries ~400 ONS regions, and a filter-only
        // query with no ranking returns an arbitrary subset if this is too low.
        regionalFilter = `country:UK AND searchTitle:"all employees" AND NOT searchLocation:"uk"`;
      }
      const regionalQuery = regionalIndex.search<AlgoliaBenchmarkHit>('', {
        filters: regionalFilter,
        hitsPerPage: 1000
      });

      // ==========================================
      // 3. EXECUTE IN PARALLEL
      // ==========================================
      const [nationalRes, regionalRes] = await Promise.all([nationalQuery, regionalQuery]);

      const nationalHit = nationalRes?.hits[0];

      // ==========================================
      // 4. MAP TO STRICT TYPES
      // ==========================================
      const macroNationalData: PercentileData = {
        mean: nationalHit?.avg_salary || nationalHit?.salary || 0,
        p10: nationalHit?.salary_10_pt || null,
        p25: nationalHit?.salary_25_pt || null,
        p50: nationalHit?.salary || 0,
        p75: nationalHit?.salary_75_pt || null,
        p90: nationalHit?.salary_90_pt || null
      };

      // Create a dictionary of all regions: { "london": { p50: 42000 }, "north west": { p50: 32000 } }
      const allRegionalData: Record<string, PercentileData> = {};

      if (regionalRes && regionalRes.hits) {
        regionalRes.hits.forEach((hit) => {
          if (hit.searchLocation) {
            allRegionalData[hit.searchLocation.toLowerCase()] = {
              mean: hit.avg_salary || hit.salary || 0,
              p10: hit.salary_10_pt || null,
              p25: hit.salary_25_pt || null,
              p50: hit.salary || 0,
              p75: hit.salary_75_pt || null,
              p90: hit.salary_90_pt || null
            };
          }
        });
      }

      // Extract the exact region the user searched for to feed the scoring engine
      const userRegionKey = userLocation?.toLowerCase();
      const userRegionalData: PercentileData | null =
        (userRegionKey && allRegionalData[userRegionKey]) || null;

      return {
        macroNationalData,
        userRegionalData, // Pass this into the scoring engine!
        allRegionalData, // Use this in your Vue templates to build maps/comparisons!
        nationalMedianAllRoles: macroNationalData.p50,
        regionalMedianAllRoles: userRegionalData?.p50 || null
      };
    } catch (error) {
      // eslint-disable-next-line no-console -- surfaces Algolia fetch failures for server-side debugging
      console.error(`Failed to fetch ${country} macro baseline data:`, error);
      return {
        macroNationalData: { mean: 35000, p10: 0, p25: 0, p50: 35000, p75: 0, p90: 0 },
        userRegionalData: null,
        allRegionalData: {},
        nationalMedianAllRoles: 35000,
        regionalMedianAllRoles: null
      };
    } finally {
      fetching.value = false;
    }
  };

  return {
    fetching,
    fetchMacroBaselines
  };
};
