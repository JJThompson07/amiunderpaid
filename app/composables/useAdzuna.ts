import { getPercentage } from '~/helpers/utility';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from 'vuefire';

export type HistogramBucket = {
  value: number;
  count: number;
};

export type HistogramData = {
  [salary: number]: number;
};

export type HistogramResponse = {
  histogram: HistogramData;
};

export const generateCacheKey = (title: string, location: string, country: string) => {
  // slugify the input: "Software Engineer" -> "software-engineer"
  const t = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-');
  const l = location
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-');
  return `${country}-${l}-${t}`; // e.g., "gb-london-software-engineer"
};

export const sanitizeAdzunaData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(sanitizeAdzunaData);
  }
  if (data !== null && typeof data === 'object') {
    return Object.keys(data).reduce((acc, key) => {
      if (!key.startsWith('__') || !key.endsWith('__')) {
        acc[key] = sanitizeAdzunaData(data[key]);
      }
      return acc;
    }, {} as any);
  }
  return data;
};

export const useAdzuna = () => {
  const distributionData = ref<any>(null);
  const jobsData = ref<any>(null);
  const loading = ref(false);
  const error = ref<any>(null);
  const db = useFirestore();

  const meanSalary = computed<number>(() => jobsData.value?.mean || 0);
  const histogramData = computed<HistogramData>(() => distributionData.value?.histogram || {});

  const histogramBuckets = computed<HistogramBucket[]>(() =>
    Object.entries(histogramData.value)
      .map(([value, count]) => ({
        value: Number(value),
        count: Number(count)
      }))
      .sort((a, b) => a.value - b.value)
  );

  const histogramRange = computed<number>(() => {
    const buckets = histogramBuckets.value;
    if (!buckets || buckets.length === 0) return 0;
    const min = buckets[0]?.value || 0;
    const max = buckets[buckets.length - 1]?.value || 0;
    return max - min;
  });

  const histogramMaxCount = computed(() => {
    return Math.max(...histogramBuckets.value.map((b) => b.count), 1);
  });

  const histogramTotalCount = computed(() => {
    return histogramBuckets.value.reduce((sum, b) => sum + b.count, 0);
  });

  const hasDistributionData = computed<boolean>(
    () => histogramBuckets.value.length > 0 && histogramTotalCount.value > 0
  );
  const hasJobsData = computed<boolean>(
    () => jobsData.value !== null && jobsData.value !== undefined
  );

  const fetchFromCacheOrApi = async (
    collectionName: string,
    apiEndpoint: string,
    title: string,
    location: string,
    country: string,
    transform: (data: any) => { data: any; [key: string]: any } = (data) => ({
      data: sanitizeAdzunaData(data)
    })
  ) => {
    const countryCode = country.toLowerCase() === 'usa' ? 'us' : 'gb';
    const cacheKey = generateCacheKey(title, location, countryCode);
    const docRef = doc(db, collectionName, cacheKey);

    // 1. Try Cache
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Optional: Add expiration check here if needed
        return data.data;
      }
    } catch (e) {
      console.warn(`Cache fetch failed for ${collectionName}:`, e);
    }

    // 2. Fetch API
    const rawData = await $fetch(apiEndpoint, {
      params: {
        title,
        location,
        country: countryCode
      }
    });

    // 3. Set Cache (Fire and forget)
    const { data, ...extraFields } = transform(rawData);
    setDoc(docRef, {
      data,
      timestamp: serverTimestamp(),
      ...extraFields
    }).catch((e) => console.warn(`Cache set failed for ${collectionName}:`, e));

    return data;
  };

  const fetchJobs = async (title: string, location: string, country: string) => {
    // We don't set global loading for jobs as it might be background or parallel
    try {
      jobsData.value = await fetchFromCacheOrApi(
        'adzuna_jobs_cache',
        '/api/adzuna/jobs',
        title,
        location,
        country,
        (rawData) => {
          const categoryTag = rawData?.results?.[0]?.category?.tag;
          return {
            data: sanitizeAdzunaData({
              mean: rawData.mean,
              count: rawData.count,
              results: rawData.results
            }), // You can replace this with explicit keys: { mean: rawData.mean, results: ... }
            categoryTag
          };
        }
      );
    } catch (e) {
      console.error('Adzuna jobs fetch error:', e);
      jobsData.value = null;
    }
  };

  const fetchHistogram = async (title: string, location: string, country: string) => {
    loading.value = true;
    error.value = null;
    try {
      distributionData.value = await fetchFromCacheOrApi(
        'adzuna_distribution_cache',
        '/api/adzuna/salary',
        title,
        location,
        country,
        (rawData) => ({
          data: sanitizeAdzunaData({ histogram: rawData.histogram })
        })
      );
    } catch (e) {
      console.error('Adzuna histogram fetch error:', e);
      error.value = e;
      distributionData.value = null;
    } finally {
      loading.value = false;
    }
  };

  const isUnderpaid = (salary: number): boolean => {
    if (!hasJobsData.value) return false;
    return salary < meanSalary.value;
  };

  const getSalaryDiffPercentage = (salary: number): number => {
    if (!hasJobsData.value || meanSalary.value === 0) return 0;
    return getPercentage(Math.abs(salary - meanSalary.value), meanSalary.value);
  };

  return {
    distributionData,
    jobsData,
    hasDistributionData,
    hasJobsData,
    loading,
    error,
    meanSalary,
    histogramData,
    histogramBuckets,
    histogramRange,
    histogramMaxCount,
    histogramTotalCount,
    fetchJobs,
    fetchHistogram,
    isUnderpaid,
    getSalaryDiffPercentage
  };
};
