import type { SearchClient } from 'algoliasearch';
import type { PercentileData } from '../utils/engineScoring/types';

export const useMacroData = () => {
  const { $algolia } = useNuxtApp();
  const fetching = ref(false);

  const NATIONAL_INDEX_NAME = 'salary_benchmarks';
  const REGIONAL_INDEX_NAME = 'regional_salary_benchmarks';

  const fetchMacroBaselines = async (country: string, userLocation?: string | null) => {
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
      const nationalQuery = nationalIndex.search('', { filters: nationalFilter, hitsPerPage: 1 });

      // ==========================================
      // 2. BUILD "ALL REGIONS" QUERY
      // ==========================================
      let regionalQuery: Promise<any> = Promise.resolve(null);

      let regionalFilter = '';
      if (country === 'USA') {
        regionalFilter = `country:USA AND id_code:"00-0000"`;
      } else {
        // Fetch ALL regions by excluding the national "all employees" record
        // We set hitsPerPage to 50 to make sure we grab every single UK region in one go
        regionalFilter = `country:UK AND searchTitle:"all employees" AND NOT searchLocation:"uk"`;
      }
      regionalQuery = regionalIndex.search('', { filters: regionalFilter, hitsPerPage: 1000 });

      // ==========================================
      // 3. EXECUTE IN PARALLEL
      // ==========================================
      const [nationalRes, regionalRes] = await Promise.all([nationalQuery, regionalQuery]);

      const nationalHit = nationalRes?.hits[0] as any;

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
        regionalRes.hits.forEach((hit: any) => {
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
      const userRegionalData =
        userLocation && allRegionalData[userLocation.toLowerCase()]
          ? allRegionalData[userLocation.toLowerCase()]
          : null;

      return {
        macroNationalData,
        userRegionalData, // Pass this into the scoring engine!
        allRegionalData, // Use this in your Vue templates to build maps/comparisons!
        nationalMedianAllRoles: macroNationalData.p50,
        regionalMedianAllRoles: userRegionalData?.p50 || null
      };
    } catch (error) {
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
