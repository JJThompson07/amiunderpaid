import { ref } from 'vue';
import { useFirestore } from 'vuefire';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export interface SalaryBenchmark {
  title: string;
  location: string;
  country: string;
  salary: number;
  year: number;
  period?: string;
}

export const useMarketData = () => {
  const db = useFirestore();

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
    if (!db) {
      error.value = 'Database not initialized';
      return;
    }

    loading.value = true;
    resetData();

    try {
      // 1. Try Adzuna API (Dummy for now)
      // This will eventually call the server API to get live data
      const apiData = null; // await $fetch('/api/adzuna', ...)
      if (apiData) {
        // TODO: Map API data to state
        return;
      }

      const coll = collection(db, 'salary_benchmarks');
      const searchTitle = title.toLowerCase();
      const searchLocation = location.toLowerCase();
      let record: SalaryBenchmark | undefined;

      if (country === 'USA') {
        // USA Strategy: Direct Title Matching (BLS Data)
        // 1. Exact Title + Location
        let q = query(
          coll,
          where('searchTitle', '==', searchTitle),
          where('searchLocation', '==', searchLocation),
          where('period', '==', period),
          limit(1)
        );
        let snapshot = await getDocs(q);
        if (!snapshot.empty && snapshot.docs[0]) {
          record = snapshot.docs[0].data() as SalaryBenchmark;
        }

        // 2. Fallback: Title + Country (National Average)
        if (!record) {
          q = query(
            coll,
            where('searchTitle', '==', searchTitle),
            where('country', '==', country),
            where('period', '==', period),
            limit(1)
          );
          snapshot = await getDocs(q);
          if (!snapshot.empty && snapshot.docs[0]) {
            record = snapshot.docs[0].data() as SalaryBenchmark;
          }
        }
      } else {
        // UK Strategy: SOC Code Mapping (ONS Data)
        // 1. Try SOC Code Mapping
        const jobQ = query(
          collection(db, 'job_titles'),
          where('searchTitle', '==', searchTitle),
          where('country', '==', country),
          limit(1)
        );
        const jobSnapshot = await getDocs(jobQ);

        if (!jobSnapshot.empty && jobSnapshot.docs[0]) {
          const jobData = jobSnapshot.docs[0].data();
          if (jobData.soc) {
            console.log(`Found SOC code: ${jobData.soc}. Fetching benchmark...`);
            const socQ = query(
              coll,
              where('id_code', '==', jobData.soc),
              where('country', '==', country),
              where('period', '==', period),
              limit(1)
            );
            const socSnapshot = await getDocs(socQ);
            if (!socSnapshot.empty && socSnapshot.docs[0])
              record = socSnapshot.docs[0].data() as SalaryBenchmark;
          }
        }

        // 2. Fallback: Direct Title Match (for broad groups like "Nurse")
        if (!record) {
          const q = query(
            coll,
            where('searchTitle', '==', searchTitle),
            where('country', '==', country),
            where('period', '==', period),
            limit(1)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty && snapshot.docs[0]) {
            record = snapshot.docs[0].data() as SalaryBenchmark;
          }
        }
      }

      // 3. Last Resort: Generic "Professional"
      if (!record) {
        console.log('No role match, retrieving generic baseline...');
        isGenericFallback.value = true;

        const q = query(
          coll,
          where('searchTitle', '==', 'professional'),
          where('country', '==', country),
          where('period', '==', period),
          limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty && snapshot.docs[0]) {
          record = snapshot.docs[0].data() as SalaryBenchmark;
        }
      }

      if (record) {
        marketAverage.value = record.salary;
        marketHigh.value = Math.round(record.salary * 1.3);
        marketLow.value = Math.round(record.salary * 0.75);
        marketDataYear.value = record.year;
        matchedTitle.value = record.title;
        marketPeriod.value = record.period || 'year';
        matchedLocation.value = record.location;

        // Now, fetch the previous year's data
        const prevYearQ = query(
          coll,
          where('searchTitle', '==', record.title.toLowerCase()),
          where('searchLocation', '==', record.location.toLowerCase()),
          where('year', '==', record.year - 1),
          where('period', '==', period),
          limit(1)
        );
        const prevYearSnapshot = await getDocs(prevYearQ);
        if (!prevYearSnapshot.empty && prevYearSnapshot.docs[0]) {
          const prevYearRecord = prevYearSnapshot.docs[0].data() as SalaryBenchmark;
          marketLastYear.value = prevYearRecord.salary;
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
    fetchMarketData
  };
};
