import { computed } from 'vue';

export type HistogramBucket = {
  value: number;
  count: number;
};

export type HistogramData = {
  [salary: number]: number;
};

const sanitizeAdzunaData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(sanitizeAdzunaData);
  }
  if (data !== null && typeof data === 'object') {
    return Object.keys(data).reduce((acc, key) => {
      if (!key.startsWith('__') && !key.endsWith('__')) {
        acc[key] = sanitizeAdzunaData(data[key]);
      }
      return acc;
    }, {} as any);
  }
  return data;
};

export const useAdzuna = () => {
  const distributionData = useState<any>('adzuna_distribution', () => null);
  const jobsData = useState<any>('adzuna_jobs', () => null);
  const categories = useState<any[]>('adzuna_categories', () => []);
  const loading = useState<boolean>('adzuna_loading', () => false);
  const cachedGovIdCode = useState<string | undefined>('adzuna_cached_gov_id', () => undefined);

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

  const fetchJobs = async (title: string, location: string, country: string) => {
    if (country === 'UK' || country === 'gb') {
      location = '';
    }

    loading.value = true;
    cachedGovIdCode.value = undefined;

    const cleanTitle = title
      .replace(/\s*\(.*?\)\s*/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim();

    try {
      const rawData: any = await $fetch('/api/adzuna/jobs', {
        params: {
          title: cleanTitle,
          location,
          country
        }
      });

      if (rawData.gov_id_code) {
        cachedGovIdCode.value = rawData.gov_id_code;
      }

      jobsData.value = sanitizeAdzunaData({
        mean: rawData.mean,
        count: rawData.count,
        results: rawData.results
      });
    } catch (e) {
      console.error('Adzuna jobs fetch error:', e);
      jobsData.value = null;
    } finally {
      loading.value = false;
    }
  };

  const fetchHistogram = async (title: string, location: string, country: string) => {
    if (country === 'UK' || country === 'gb') {
      location = '';
    }

    loading.value = true;

    try {
      const rawData: any = await $fetch('/api/adzuna/salary', {
        params: {
          title,
          location,
          country
        }
      });

      distributionData.value = sanitizeAdzunaData({ histogram: rawData.histogram });
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
    cachedGovIdCode,
    fetchJobs,
    fetchHistogram,
    fetchCategories,
    isUnderpaid
  };
};
