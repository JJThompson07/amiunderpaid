import { ref, computed } from 'vue';
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

const generateCacheKey = (title: string, location: string, country: string) => {
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

const sanitizeAdzunaData = (data: any): any => {
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
  const categories = ref<any[]>([]);
  const loading = ref(false);
  const db = useFirestore();

  const meanSalary = computed<number>(() => jobsData.value?.mean || 0);
  const jobsCount = computed<number>(() => jobsData.value?.count || 0);
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

        // Check expiration based on category settings
        let isExpired = false;
        const categoryTag = data.categoryTag;

        if (categoryTag) {
          // Construct ID matching admin panel: 'uk-tag' or 'usa-tag'
          const adminCountry = country.toLowerCase() === 'usa' ? 'usa' : 'uk';
          const categoryId = `${adminCountry}-${categoryTag}`.toLowerCase();

          const categoryDocRef = doc(db, 'adzuna_categories', categoryId);
          const categoryDocSnap = await getDoc(categoryDocRef);

          if (categoryDocSnap.exists()) {
            const categoryData = categoryDocSnap.data();
            const cacheLimit = categoryData?.cache || 120;

            const now = new Date();
            const dataDate = data.timestamp?.toDate() || new Date(0);
            const diffTime = Math.abs(now.getTime() - dataDate.getTime());
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (diffDays > cacheLimit) {
              console.log(
                `[Cache] Expired for ${categoryTag}. Age: ${diffDays.toFixed(1)} days. Limit: ${cacheLimit} days.`
              );
              isExpired = true;
            }
          }
        }

        if (!isExpired) {
          console.log(`[Cache] Hit for ${collectionName}`);
          return data.data;
        }
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
    // for now due to api limitations, ignore the location field
    location = '';
    loading.value = true;

    // Clean title for Adzuna: remove (Group) and non-alphanumeric
    const cleanTitle = title
      .replace(/\s*\(.*?\)\s*/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim();

    try {
      jobsData.value = await fetchFromCacheOrApi(
        'adzuna_jobs_cache',
        '/api/adzuna/jobs',
        cleanTitle,
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
    } finally {
      loading.value = false;
    }
  };

  const fetchHistogram = async (
    title: string,
    location: string,
    country: string,
    categoryTag?: string
  ) => {
    // for now due to api limitations, ignore the location field
    location = '';

    loading.value = true;
    try {
      distributionData.value = await fetchFromCacheOrApi(
        'adzuna_distribution_cache',
        '/api/adzuna/salary',
        title,
        location,
        country,
        (rawData) => {
          const tag = categoryTag || jobsData.value?.results?.[0]?.category?.tag;
          return {
            data: sanitizeAdzunaData({ histogram: rawData.histogram }),
            categoryTag: tag
          };
        }
      );
    } catch (e) {
      console.error('Adzuna histogram fetch error:', e);
      distributionData.value = null;
    } finally {
      loading.value = false;
    }
  };

  const fetchCategories = async (country: string) => {
    const countryCode = country.toLowerCase() === 'usa' ? 'us' : 'gb';
    try {
      const response: any = await $fetch('/api/adzuna/categories', {
        params: { country: countryCode }
      });

      const sanitized = sanitizeAdzunaData(response);
      categories.value = sanitized.results || [];
    } catch (e) {
      console.error('Adzuna categories fetch error:', e);
      throw e;
    }
  };

  const isUnderpaid = (salary: number): boolean => {
    if (!hasJobsData.value) return false;
    return salary < meanSalary.value;
  };

  return {
    distributionData,
    jobsData,
    categories,
    hasJobsData,
    hasDistributionData,
    loading,
    meanSalary,
    jobsCount,
    histogramBuckets,
    histogramRange,
    histogramMaxCount,
    histogramTotalCount,
    fetchJobs,
    fetchHistogram,
    fetchCategories,
    isUnderpaid
  };
};
