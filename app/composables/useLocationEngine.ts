import { ref, computed, watch } from 'vue';
import { getRawDiffPercentage } from '~/helpers/utility';
import type { SalaryBenchmark } from '~/composables/useMarketData';

export const useLocationEngine = async (mode: 'salary' | 'benchmark') => {
  const route = useRoute();
  const { t } = useI18n();
  const { trackAmbiguousSearch } = useAnalytics();

  // 1. Core Route State
  const govId = ref<string>(route.query.gov_id as string);
  const jobType = ref<string>((route.query.schedule as string) || 'full-time');
  const contractType = ref<string>((route.query.contract as string) || 'permanent');
  const searchConfirmed = ref<boolean>(
    (import.meta.client ? history.state?.confirmed : false) || !!govId.value
  );
  const showUserSelection = ref<boolean>(false);
  const userSelected = ref<boolean>(false);

  // 2. Formatting Helpers
  const unslugify = (slug: string) => {
    if (!slug) return '';
    return slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const displayTitle = computed<string>(() =>
    unslugify((route.params.title as string) || 'Professional')
  );
  const country = computed<string>(() => (route.params.country as string)?.toUpperCase() || 'UK');
  const location = computed<string>(() =>
    route.params.location ? unslugify(route.params.location as string) : ''
  );
  const userSalary = ref<number>(Number(route.query.compare) || 0);
  const searchTitle = ref<string>((route.query.q as string) || displayTitle.value);
  const currencySymbol = computed<string>(() => (country.value === 'USA' ? '$' : '£'));

  // 3. Import Data Composables
  const adzuna = useAdzuna();
  const marketData = useMarketData();
  const macroData = useMacroData();
  const microData = useMicroData();

  // 4. The Orchestrator
  const asyncDataKey = computed<string>(
    () => `${mode}-${country.value}-${location.value}-${searchTitle.value}`
  );

  const {
    data: pageData,
    pending,
    refresh
  } = await useAsyncData(
    asyncDataKey.value,
    async () => {
      await Promise.all([
        adzuna.fetchJobs(
          searchTitle.value,
          location.value,
          country.value,
          jobType.value,
          contractType.value
        ),
        adzuna.fetchHistogram(searchTitle.value, location.value, country.value)
      ]);

      const targetGovId = govId.value || adzuna.cachedGovIdCode.value;

      if (country.value === 'UK') {
        await marketData.resolveUkIdentity(searchTitle.value, targetGovId);
      } else {
        await marketData.resolveUsaIdentity(searchTitle.value, targetGovId);
      }

      const resolvedTitle = marketData.matchedTitle.value || searchTitle.value;
      const resolvedId = marketData.matchedIdCode.value;

      const [macro, micro] = await Promise.all([
        macroData.fetchMacroBaselines(country.value, location.value),
        microData.fetchMicroBaselines(country.value, resolvedTitle, location.value, resolvedId)
      ]);

      if (micro.officialGroupTitle) {
        marketData.matchedTitle.value = micro.officialGroupTitle;
      }

      return {
        macro,
        micro,
        resolvedTitle: micro.officialGroupTitle || resolvedTitle,
        resolvedId
      };
    },
    { watch: [asyncDataKey], dedupe: 'defer', server: true }
  );

  // 5. The Bridge Computeds
  const marketAverage = computed<number>(
    () =>
      pageData.value?.micro?.microNationalData?.mean ||
      pageData.value?.micro?.microNationalData?.p50 ||
      0
  );
  const marketLow = computed<number>(() => pageData.value?.micro?.microNationalData?.p25 || 0);
  const marketHigh = computed<number>(() => pageData.value?.micro?.microNationalData?.p75 || 0);
  const marketDataYear = ref<number>(new Date().getFullYear());
  const matchedLocation = computed<string>(() =>
    pageData.value?.micro?.microRegionalData ? location.value : 'National'
  );

  const regionalData = computed<SalaryBenchmark | null>(() => {
    const data = pageData.value?.micro?.microRegionalData;
    if (!data) return null;
    return {
      title: marketData.matchedTitle.value || displayTitle.value,
      location: location.value,
      salary: data.p50,
      avg_salary: data.mean,
      salary_10_pt: data.p10 || 0,
      salary_25_pt: data.p25 || 0,
      salary_75_pt: data.p75 || 0,
      salary_90_pt: data.p90 || 0
    };
  });

  const hasGovernmentData = computed<boolean>(() => {
    if (marketAverage.value === 0) return false;
    if (marketData.isGenericFallback.value && displayTitle.value.toLowerCase() !== 'professional')
      return false;
    return true;
  });

  const isUnderpaid = computed<boolean>(
    () => userSalary.value > 0 && userSalary.value < marketAverage.value && diffPercent.value < -2.5
  );
  const diffPercent = computed<number>(() =>
    userSalary.value === 0 || marketAverage.value === 0
      ? 0
      : getRawDiffPercentage(userSalary.value, marketAverage.value)
  );
  const jobListings = computed(() =>
    (adzuna.jobsData.value?.results || []).sort((a: any, b: any) => b.salary_max - a.salary_max)
  );
  const isAdminVerified = computed<boolean>(() =>
    Boolean(userSelected.value || govId.value || !!adzuna.cachedGovIdCode.value)
  );
  const adzunaCategory = computed<string>(
    () => adzuna.jobsData.value?.results?.[0]?.category?.label
  );

  const McaScore = computed(() => {
    if (!pageData.value?.macro?.macroNationalData) return null;
    const hasMicro = !!pageData.value?.micro?.microNationalData;
    const hasLive = (adzuna.histogramTotalCount.value || 0) > 0;
    if (!hasMicro && !hasLive) return null;

    const rawResult =
      country.value === 'UK'
        ? calculateUKBenchmarkScore(
            userSalary.value,
            pageData.value.macro.macroNationalData,
            pageData.value.micro.microNationalData || null,
            pageData.value.micro.officialGroupTitle || '',
            pageData.value.micro.microRegionalData || null,
            pageData.value.macro.regionalMedianAllRoles,
            pageData.value.macro.nationalMedianAllRoles,
            adzuna.histogramBuckets.value,
            adzuna.jobsCount.value || 0,
            adzuna.meanSalary.value || 0
          )
        : calculateUSABenchmarkScore(
            userSalary.value,
            pageData.value.macro.macroNationalData,
            pageData.value.macro.userRegionalData || null,
            pageData.value.micro.microNationalData || null,
            pageData.value.micro.microRegionalData || null,
            pageData.value.macro.regionalMedianAllRoles,
            pageData.value.macro.nationalMedianAllRoles,
            adzuna.histogramBuckets.value,
            adzuna.jobsCount.value || 0,
            adzuna.meanSalary.value || 0
          );

    return formatMcaScoreForUi(
      rawResult,
      marketData.matchedTitle.value || searchTitle.value,
      location.value,
      t
    );
  });

  // 6. Shared Methods
  const handleAmbiguitySelect = async (match: any) => {
    const exactId = match.id_code || match.soc || match.objectID;
    govId.value = exactId;
    trackAmbiguousSearch(match.title, match.group);

    try {
      await $fetch('/api/adzuna/update-match', {
        method: 'POST',
        body: {
          title: searchTitle.value,
          location: location.value,
          country: country.value === 'USA' ? 'USA' : 'UK',
          gov_id_code: exactId,
          gov_title: match.title,
          is_automatic: false,
          job_type: jobType.value,
          contract_type: contractType.value
        }
      });
    } catch {
      /* Silent fail */
    }

    showUserSelection.value = false;
    userSelected.value = true;
    searchConfirmed.value = true;

    await refresh();
  };

  // 7. Shared Watchers
  watch(marketData.resolving, (newLoading) => {
    if (newLoading === false) {
      if (
        import.meta.client &&
        hasGovernmentData.value &&
        !marketData.isGenericFallback.value &&
        marketData.matchedIdCode.value &&
        !govId.value
      ) {
        $fetch('/api/adzuna/update-match', {
          method: 'POST',
          body: {
            title: searchTitle.value,
            location: location.value,
            country: country.value === 'USA' ? 'us' : 'uk',
            gov_id_code: marketData.matchedIdCode.value,
            gov_title: marketData.matchedTitle.value,
            is_automatic: true,
            job_type: jobType.value,
            contract_type: contractType.value
          }
        }).catch(() => {});
      }

      if (
        location.value &&
        hasGovernmentData.value &&
        matchedLocation.value.toLowerCase() !== location.value.toLowerCase()
      ) {
        if (matchedLocation.value.toLowerCase() === country.value.toLowerCase()) {
          // Dynamic redirect based on the mode
          navigateTo(
            {
              path: `/${mode}/${route.params.title}/${route.params.country}`,
              query: route.query,
              state: { ...history.state }
            },
            { replace: true }
          );
        }
      }
    }
  });

  watch(userSalary, (newSalary) => {
    if (newSalary > 0) {
      navigateTo({ query: { ...route.query, compare: newSalary.toString() } }, { replace: true });
    } else {
      const { compare, ...rest } = route.query;
      navigateTo({ query: rest }, { replace: true });
    }
  });

  // Return everything the template needs
  return {
    // State
    pending,
    adzunaLoading: adzuna.loading,
    resolving: marketData.resolving,
    showUserSelection,
    userSalary,
    // Data
    displayTitle,
    country,
    location,
    searchTitle,
    jobType,
    contractType,
    currencySymbol,
    matchedTitle: marketData.matchedTitle,
    matchedLocation,
    marketDataYear,
    adzunaCategory,
    // Computeds
    hasGovernmentData,
    hasJobsData: adzuna.hasJobsData,
    McaScore,
    diffPercent,
    isUnderpaid,
    marketAverage,
    marketLow,
    marketHigh,
    regionalData,
    jobListings,
    isAdminVerified,
    histogramBuckets: adzuna.histogramBuckets,
    histogramRange: adzuna.histogramRange,
    histogramMaxCount: adzuna.histogramMaxCount,
    histogramTotalCount: adzuna.histogramTotalCount,
    meanSalary: adzuna.meanSalary,
    jobsCount: adzuna.jobsCount,
    // Methods
    handleAmbiguitySelect,
    isUnderpaidAdzuna: adzuna.isUnderpaid
  };
};
