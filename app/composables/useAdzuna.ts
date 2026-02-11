import { getPercentage } from '~/helpers/utility';

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

export const useAdzuna = () => {
  const distributionData = ref<any>(null);
  const jobsData = ref<any>(null);
  const loading = ref(false);
  const error = ref<any>(null);

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

  const fetchAdzunaData = async (title: string, location: string, country: string) => {
    loading.value = true;
    error.value = null;

    const countryCode = country.toLowerCase() === 'usa' ? 'us' : 'gb';

    try {
      const [salary, jobs] = await Promise.all([
        $fetch('/api/adzuna/salary', {
          params: {
            title,
            location,
            country: countryCode
          }
        }),
        $fetch('/api/adzuna/jobs', {
          params: {
            title,
            location,
            country: countryCode
          }
        })
      ]);
      distributionData.value = salary;
      jobsData.value = jobs;
    } catch (e) {
      console.error('Adzuna fetch error:', e);
      error.value = e;
      distributionData.value = null;
      jobsData.value = null;
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
    fetchAdzunaData,
    isUnderpaid,
    getSalaryDiffPercentage
  };
};
