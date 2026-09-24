import type { ComputedRef, Ref } from 'vue';
import type { JobListing } from '~~/shared/utils/market-data';

/** Number of listings requested per tier from the API for the dedicated /jobs experience. */
const JOBS_RESULTS_PER_PAGE = 100;

export type JobSortMode = 'relevance' | 'salary_max' | 'salary_avg' | 'salary_min';

export type UseJobSearchEngineReturn = {
  pending: Ref<boolean>;
  loading: ReturnType<typeof useJobs>['loading'];
  displayTitle: ComputedRef<string>;
  country: ComputedRef<string>;
  location: ComputedRef<string>;
  searchTitle: Ref<string>;
  jobType: Ref<string>;
  contractType: Ref<string>;
  category: Ref<string | undefined>;
  sortMode: Ref<JobSortMode>;
  sortedExactListings: ComputedRef<JobListing[]>;
  sortedSimilarListings: ComputedRef<JobListing[]>;
  hasJobsData: ReturnType<typeof useJobs>['hasJobsData'];
  hasSimilarJobsData: ReturnType<typeof useJobs>['hasSimilarJobsData'];
  jobsCount: ComputedRef<number>;
  meanSalary: ReturnType<typeof useJobs>['meanSalary'];
  dataProvider: ReturnType<typeof useJobs>['dataProvider'];
  adzunaCategory: ComputedRef<string | undefined>;
};

const unslugify = (slug: string): string => {
  if (!slug) {
    return '';
  }
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

const averageSalary = (job: JobListing): number => {
  if (job.salary_min && job.salary_max) {
    return (job.salary_min + job.salary_max) / 2;
  }
  return job.salary_max || job.salary_min || 0;
};

const hasSalaryData = (job: JobListing): boolean =>
  Boolean(job.salary_min) || Boolean(job.salary_max);

const salaryComparators: Record<
  Exclude<JobSortMode, 'relevance'>,
  (a: JobListing, b: JobListing) => number
> = {
  salary_max: (a, b) => (b.salary_max || b.salary_min || 0) - (a.salary_max || a.salary_min || 0),
  salary_avg: (a, b) => averageSalary(b) - averageSalary(a),
  salary_min: (a, b) => (a.salary_min || a.salary_max || 0) - (b.salary_min || b.salary_max || 0)
};

/**
 * Sorts a tier's listings by the active sort mode. `'relevance'` keeps the
 * server's ranked order. Listings without salary data always sort to the
 * bottom regardless of direction -- otherwise an ascending ('salary_min')
 * sort would put them first, since a missing salary defaults to 0 -- see
 * design.md's Risks/Trade-offs table.
 */
const sortListings = (jobs: JobListing[], mode: JobSortMode): JobListing[] => {
  if (mode === 'relevance') {
    return jobs;
  }

  const comparator = salaryComparators[mode];
  return [...jobs].sort((a, b) => {
    const aHasSalary = hasSalaryData(a);
    const bHasSalary = hasSalaryData(b);
    if (aHasSalary !== bHasSalary) {
      return aHasSalary ? -1 : 1;
    }
    return comparator(a, b);
  });
};

/**
 * Encapsulates `/jobs` page logic: route param parsing, fetching the
 * dual-tier listing set, and multi-criteria sorting. Mirrors
 * useLocationEngine.ts's route/fetch patterns but stripped of
 * salary-comparison-specific logic (no MCA scoring, no government-data
 * resolution) -- see openspec/changes/live-job-search-and-tier-split
 * design.md Decision 4. Recruiter card integration is deliberately NOT done
 * here: useRecruiterCards() calls useRoute() internally, and calling it
 * after this composable's own internal `await useAsyncData(...)` loses
 * Nuxt's async instance context (only a page/component's top-level <script
 * setup> gets that preserved across awaits) -- confirmed via a real 500 at
 * runtime. Call useRecruiterCards() from the consuming page instead, exactly
 * like useLocationEngine.ts's callers already do.
 */
export const useJobSearchEngine = async (): Promise<UseJobSearchEngineReturn> => {
  const route = useRoute();
  const jobs = useJobs();
  const devProviderOverride = useDevProviderOverride();

  const jobType = ref<string>((route.query.schedule as string) || 'full-time');
  const contractType = ref<string>((route.query.contract as string) || 'permanent');
  const category = ref<string | undefined>((route.query.category as string) || undefined);
  const sortMode = ref<JobSortMode>((route.query.sort as JobSortMode) || 'relevance');

  const displayTitle = computed<string>(() => unslugify((route.params.title as string) || ''));
  const country = computed<string>(() => (route.params.country as string)?.toUpperCase() || 'UK');
  const location = computed<string>(() =>
    route.params.location ? unslugify(route.params.location as string) : ''
  );
  const searchTitle = ref<string>((route.query.q as string) || displayTitle.value);

  const asyncDataKey = computed<string>(
    () =>
      `jobs-${country.value}-${location.value}-${searchTitle.value}-${devProviderOverride.value}-${category.value || 'none'}-${jobType.value}-${contractType.value}`
  );

  const { pending } = await useAsyncData(
    asyncDataKey.value,
    async () => {
      await jobs.fetchJobs(
        searchTitle.value,
        location.value,
        country.value,
        jobType.value,
        contractType.value,
        devProviderOverride.value,
        category.value,
        JOBS_RESULTS_PER_PAGE
      );
      return true;
    },
    { watch: [asyncDataKey], dedupe: 'defer', server: true }
  );

  const sortedExactListings = computed<JobListing[]>(() =>
    sortListings(jobs.jobsData.value?.results || [], sortMode.value)
  );
  const sortedSimilarListings = computed<JobListing[]>(() =>
    sortListings(jobs.similarJobsData.value, sortMode.value)
  );

  const jobsCount = computed<number>(
    () => sortedExactListings.value.length + sortedSimilarListings.value.length
  );

  const adzunaCategory = computed<string | undefined>(
    () => jobs.jobsData.value?.results?.[0]?.category?.label
  );

  watch(sortMode, (newMode) => {
    navigateTo({ query: { ...route.query, sort: newMode } }, { replace: true });
  });

  return {
    pending,
    loading: jobs.loading,
    displayTitle,
    country,
    location,
    searchTitle,
    jobType,
    contractType,
    category,
    sortMode,
    sortedExactListings,
    sortedSimilarListings,
    hasJobsData: jobs.hasJobsData,
    hasSimilarJobsData: jobs.hasSimilarJobsData,
    jobsCount,
    meanSalary: jobs.meanSalary,
    dataProvider: jobs.dataProvider,
    adzunaCategory
  };
};
