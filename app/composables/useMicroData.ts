import type { SearchClient } from 'algoliasearch';
import type { PercentileData } from '../utils/engineScoring/types';

export const useMicroData = () => {
  const { $algolia } = useNuxtApp();
  const fetching = ref(false);

  const NATIONAL_INDEX_NAME = 'salary_benchmarks';
  const REGIONAL_INDEX_NAME = 'regional_salary_benchmarks';

  const fetchMicroBaselines = async (
    country: string,
    title: string,
    userLocation?: string | null,
    idCode?: string | null
  ) => {
    fetching.value = true;
    const client = $algolia as SearchClient;

    const nationalIndex = client.initIndex(NATIONAL_INDEX_NAME);
    const regionalIndex = client.initIndex(REGIONAL_INDEX_NAME);

    try {
      // ==========================================
      // 1. BUILD THE BULLETPROOF FILTER
      // ==========================================
      let baseFilter = `country:${country}`;

      if (idCode) {
        // EXACT ID MATCH (Fastest & Safest)
        const cleanId = String(idCode).trim();
        if (country === 'USA') {
          // USA has hyphens, so we need quotes to prevent math subtraction bugs in Algolia
          baseFilter += ` AND (id_code:"${cleanId}")`;
        } else {
          // UK usually treats SOC codes as numbers
          // baseFilter += ` AND id_code:${cleanId}`;
        }
      } else {
        // FALLBACK: TEXT MATCH (If no ID was resolved)
        const cleanTitle = title.toLowerCase().replace(/"/g, '\\"');
        baseFilter += ` AND searchTitle:"${cleanTitle}"`;
      }

      // ==========================================
      // 2. BUILD QUERIES
      // ==========================================
      const nationalQuery = nationalIndex.search('', { filters: baseFilter, hitsPerPage: 1 });

      // For regional, we grab all regions for this specific job
      const regionalQuery = regionalIndex.search('', { filters: baseFilter, hitsPerPage: 1000 });

      // ==========================================
      // 3. EXECUTE IN PARALLEL
      // ==========================================
      const [nationalRes, regionalRes] = await Promise.all([nationalQuery, regionalQuery]);

      const nationalHit = nationalRes?.hits[0] as any;

      // Extract the official Group Title from the benchmark record
      const officialGroupTitle = nationalHit?.title || null;

      // ==========================================
      // 4. MAP TO STRICT TYPES
      // ==========================================
      const microNationalData: PercentileData | null = nationalHit
        ? {
            mean: nationalHit.avg_salary || nationalHit.salary || 0,
            p10: nationalHit.salary_10_pt || null,
            p25: nationalHit.salary_25_pt || null,
            p50: nationalHit.salary || 0,
            p75: nationalHit.salary_75_pt || null,
            p90: nationalHit.salary_90_pt || null
          }
        : null;

      const allRegionalMicroData: Record<string, PercentileData> = {};

      if (regionalRes && regionalRes.hits) {
        regionalRes.hits.forEach((hit: any) => {
          if (hit.searchLocation) {
            allRegionalMicroData[hit.searchLocation.toLowerCase()] = {
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

      const microRegionalData =
        userLocation && allRegionalMicroData[userLocation.toLowerCase()]
          ? allRegionalMicroData[userLocation.toLowerCase()]
          : null;

      return {
        microNationalData,
        microRegionalData,
        allRegionalMicroData,
        officialGroupTitle
      };
    } catch (error) {
      console.error(`Failed to fetch ${country} micro baseline data for ${title}:`, error);
      return {
        microNationalData: null,
        microRegionalData: null,
        allRegionalMicroData: {},
        officialGroupTitle: null
      };
    } finally {
      fetching.value = false;
    }
  };

  return {
    fetching,
    fetchMicroBaselines
  };
};
