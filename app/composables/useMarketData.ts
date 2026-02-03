import { ref } from 'vue';
import { useFirestore } from 'vuefire';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export interface SalaryBenchmark {
  title: string;
  location: string;
  country: string;
  salary: number;
  year: number;
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
  const isGenericFallback = ref(false);

  // Reset state helper
  const resetData = () => {
    marketAverage.value = 0;
    marketHigh.value = 0;
    marketLow.value = 0;
    marketLastYear.value = 0;
    marketDataYear.value = 0;
    isGenericFallback.value = false;
    error.value = null;
  };

  /**
   * Fetches salary data with a 3-step fallback strategy:
   * 1. Exact Match (Title + Location)
   * 2. Country Match (Title + Country)
   * 3. Generic Match (Professional + Country)
   */
  const fetchMarketData = async (title: string, location: string, country: string) => {
    if (!db) {
      error.value = 'Database not initialized';
      return;
    }

    loading.value = true;
    resetData();

    try {
      const coll = collection(db, 'salary_benchmarks');
      const searchTitle = title.toLowerCase();
      const searchLocation = location.toLowerCase();
      let record: SalaryBenchmark | undefined;

      // 1. Try Exact Match
      let q = query(
        coll,
        where('searchTitle', '==', searchTitle),
        where('searchLocation', '==', searchLocation),
        limit(1)
      );
      let snapshot = await getDocs(q);

      if (!snapshot.empty && snapshot.docs[0]) {
        record = snapshot.docs[0].data() as SalaryBenchmark;
      }

      // 2. Fallback: Try Title + Country
      if (!record) {
        console.log('No exact city match, checking national average...');
        q = query(
          coll,
          where('searchTitle', '==', searchTitle),
          where('country', '==', country),
          limit(1)
        );
        snapshot = await getDocs(q);
        if (!snapshot.empty && snapshot.docs[0]) {
          record = snapshot.docs[0].data() as SalaryBenchmark;
        }
      }

      // 3. Last Resort: Generic "Professional"
      if (!record) {
        console.log('No role match, retrieving generic baseline...');
        isGenericFallback.value = true;

        q = query(
          coll,
          where('searchTitle', '==', 'professional'),
          where('country', '==', country),
          limit(1)
        );
        snapshot = await getDocs(q);

        if (!snapshot.empty && snapshot.docs[0]) {
          record = snapshot.docs[0].data() as SalaryBenchmark;
        }
      }

      if (record) {
        marketAverage.value = record.salary;
        marketHigh.value = Math.round(record.salary * 1.3);
        marketLow.value = Math.round(record.salary * 0.75);
        marketDataYear.value = record.year;

        // Now, fetch the previous year's data
        const prevYearQ = query(
          coll,
          where('searchTitle', '==', record.title.toLowerCase()),
          where('searchLocation', '==', record.location.toLowerCase()),
          where('year', '==', record.year - 1),
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
    isGenericFallback,
    fetchMarketData,
  };
};
