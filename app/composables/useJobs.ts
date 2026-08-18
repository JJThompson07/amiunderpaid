import type { ComputedRef, Ref } from 'vue';
import { sanitizeAdzunaData } from '~~/shared/utils/sanitize';
import type {
  JobCategoryEntry,
  JobSearchResponse,
  MarketDataProvider,
  SalaryDistributionResponse
} from '~~/shared/utils/market-data';

export type HistogramData = Record<number, number>;

// Re-export so consumers don't need two import paths
export type {
  JobCategoryEntry,
  JobListing,
  JobSearchResponse,
  MarketDataProvider,
  SalaryDistributionResponse
} from '~~/shared/utils/market-data';

/**
 * useJobs Composable
 *
 * Fetches market data (jobs, salaries, categories) from our Nuxt API endpoints.
 * Note: Our backend acts as an API gateway. It natively queries Adzuna but will
 * seamlessly fall back to Reed if Adzuna hits a rate limit (429 Error). The client
 * remains completely agnostic to which provider was used.
 */
export type UseJobsReturn = {
  distributionData: Ref<SalaryDistributionResponse | null>;
  jobsData: Ref<JobSearchResponse | null>;
  categories: Ref<JobCategoryEntry[]>;
  hasJobsData: ComputedRef<boolean>;
  hasDistributionData: ComputedRef<boolean>;
  loading: ComputedRef<boolean>;
  meanSalary: ComputedRef<number>;
  jobsCount: ComputedRef<number>;
  histogramBuckets: ComputedRef<HistogramBucket[]>;
  histogramRange: ComputedRef<number>;
  histogramMaxCount: ComputedRef<number>;
  histogramTotalCount: ComputedRef<number>;
  cachedGovIdCode: Ref<string | undefined>;
  dataProvider: ComputedRef<MarketDataProvider>;
  fetchJobs: (
    title: string,
    location: string,
    country: string,
    jobType?: string,
    contractType?: string,
    devProviderOverride?: string
  ) => Promise<void>;
  fetchHistogram: (
    title: string,
    location: string,
    country: string,
    jobType?: string,
    contractType?: string,
    devProviderOverride?: string
  ) => Promise<void>;
  fetchCategories: (country: string) => Promise<void>;
  isUnderpaid: (salary: number) => boolean;
};

export const useJobs = (): UseJobsReturn => {
  const distributionData = useState<SalaryDistributionResponse | null>(
    'market_data_distribution',
    () => null
  );
  const jobsData = useState<JobSearchResponse | null>('market_data_jobs', () => null);
  const categories = useState<JobCategoryEntry[]>('market_data_categories', () => []);
  const activeRequests = useState<number>('market_data_loading_count', () => 0);
  const loading = computed(() => activeRequests.value > 0);
  const cachedGovIdCode = useState<string | undefined>(
    'market_data_cached_gov_id',
    () => undefined
  );

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
    if (!buckets || buckets.length === 0) {
      return 0;
    }
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
    () => jobsData.value !== null && jobsData.value !== undefined && jobsCount.value > 0
  );

  const fetchJobs = async (
    title: string,
    location: string,
    country: string,
    jobType: string = 'full-time',
    contractType: string = 'permanent',
    devProviderOverride?: string
  ): Promise<void> => {
    activeRequests.value++;
    cachedGovIdCode.value = undefined;

    // Wipe the underlying distribution state so computed properties reset
    distributionData.value = null;

    const cleanTitle = title
      .replace(/\s*\(.*?\)\s*/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim();

    try {
      const rawData = await $fetch<
        JobSearchResponse & { gov_id_code?: string; is_admin_verified?: boolean }
      >('/api/market-data/jobs', {
        params: {
          title: cleanTitle,
          location,
          country,
          jobType,
          contractType,
          devProvider: devProviderOverride === 'auto' ? undefined : devProviderOverride
        }
      });

      // ONLY use the cached ID if an admin has explicitly verified it
      if (rawData.gov_id_code && rawData.is_admin_verified) {
        cachedGovIdCode.value = String(rawData.gov_id_code).trim();
      }

      jobsData.value = sanitizeAdzunaData({
        mean: rawData.mean,
        count: rawData.count,
        results: rawData.results,
        provider: rawData.provider || 'adzuna'
      });
    } catch {
      jobsData.value = null;
    } finally {
      activeRequests.value = Math.max(0, activeRequests.value - 1);
    }
  };

  const fetchHistogram = async (
    title: string,
    location: string,
    country: string,
    jobType: string = 'full-time',
    contractType: string = 'permanent',
    devProviderOverride?: string
  ): Promise<void> => {
    activeRequests.value++;

    try {
      const rawData = await $fetch<SalaryDistributionResponse>('/api/market-data/salary', {
        params: {
          title,
          location,
          country,
          jobType,
          contractType,
          devProvider: devProviderOverride === 'auto' ? undefined : devProviderOverride
        }
      });

      distributionData.value = sanitizeAdzunaData({
        histogram: rawData.histogram,
        provider: rawData.provider || 'adzuna'
      });
    } catch {
      distributionData.value = null;
    } finally {
      activeRequests.value = Math.max(0, activeRequests.value - 1);
    }
  };

  const fetchCategories = async (country: string): Promise<void> => {
    const countryCode = country.toLowerCase() === 'usa' ? 'us' : 'gb';

    const response = await $fetch<{ results?: JobCategoryEntry[] }>('/api/market-data/categories', {
      params: { country: countryCode }
    });

    const sanitized = sanitizeAdzunaData(response);
    categories.value = sanitized.results || [];
  };

  const isUnderpaid = (salary: number): boolean => {
    if (!hasJobsData.value) {
      return false;
    }
    return salary < meanSalary.value;
  };

  const dataProvider = computed<MarketDataProvider>(
    () => jobsData.value?.provider || distributionData.value?.provider || 'adzuna'
  );

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
    dataProvider,
    fetchJobs,
    fetchHistogram,
    fetchCategories,
    isUnderpaid
  };
};
