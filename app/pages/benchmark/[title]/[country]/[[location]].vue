<template>
  <div
    :key="route.fullPath"
    class="min-h-screen pt-16 pb-8 bg-slate-50 flex flex-col relative gap-6 max-w-7xl mx-auto">
    <SectionSharedBackdrop />

    <AmILocationBreadcrumbs
      class="relative"
      :route="route"
      :display-title="displayTitle"
      :country="country"
      :location="location" />

    <div class="flex flex-wrap gap-2 justify-between items-end">
      <h1 class="relative text-3xl md:text-6xl text-white font-bold px-4 sm:whitespace-nowrap">
        {{ displayTitle }}
      </h1>
      <h2
        class="relative sm:text-lg md:text-xl text-white font-bold px-4 capitalize sm:whitespace-nowrap">
        {{ jobType }} - {{ contractType }}
      </h2>
    </div>

    <LazySectionNoData
      v-if="!pending && !adzunaLoading && !hasGovernmentData && !hasJobsData"
      :title="displayTitle"
      :location="location"
      :country="country"
      @select="handleAmbiguitySelect" />

    <div
      v-show="!pending && (hasGovernmentData || hasJobsData)"
      class="relative grid grid-cols-1 px-4 gap-6">
      <div class="relative mx-auto flex flex-col gap-6 w-full">
        <SectionScoreMca
          v-if="McaScore"
          :verdict="McaScore"
          :user-salary="userSalary"
          :currency-symbol="currencySymbol"
          :matched-title="matchedTitle"
          :location="location" />

        <div class="flex flex-col gap-6 md:flex-row">
          <div v-if="hasJobsData" class="flex flex-col flex-1 min-w-0 gap-3 adzuna-section">
            <LazySectionAdzunaComparison
              class="flex-1"
              :buckets="histogramBuckets"
              :histogram-range="histogramRange"
              :histogram-max-count="histogramMaxCount"
              :histogram-total-count="histogramTotalCount"
              :is-underpaid="isUnderpaidAdzuna(userSalary)"
              :currency-symbol="currencySymbol"
              :average-salary="meanSalary"
              :current-salary="userSalary"
              :loading="adzunaLoading"
              :country="country"
              :location="location"
              :display-title="displayTitle"
              :jobs-count="jobsCount" />
          </div>

          <div
            v-if="hasGovernmentData && !showUserSelection"
            class="flex flex-col flex-1 min-w-0 gap-3 government-section relative">
            <LazySectionGovernmentComparison
              class="overflow-hidden flex-1"
              :is-fallback="!hasJobsData"
              :display-title="displayTitle"
              :search-title="searchTitle"
              :matched-title="matchedTitle"
              :location="location"
              :country="country"
              :user-salary="userSalary"
              :market-average="marketAverage"
              :market-low="marketLow"
              :market-high="marketHigh"
              :currency-symbol="currencySymbol"
              :matched-location="matchedLocation"
              :market-data-year="marketDataYear"
              :diff-percent="diffPercent"
              :is-underpaid="isUnderpaid"
              :is-verified="isAdminVerified"
              @user-select="showUserSelection = true" />
          </div>

          <div
            v-if="(hasJobsData && !hasGovernmentData && !loading && !pending) || showUserSelection"
            class="flex flex-col flex-1 min-w-0 gap-3 relative">
            <LazySectionGovernmentUserSelection
              class="flex-1 w-full"
              :adzuna-category="adzunaCategory"
              :country="country"
              @select="handleAmbiguitySelect" />
          </div>
        </div>

        <div class="flex flex-row gap-6">
          <SectionUKComparison
            v-show="country === 'UK' && regionalData && location"
            class="flex-4"
            :country="country"
            :location="location"
            :display-title="matchedTitle || displayTitle"
            :market-average="marketAverage"
            :user-salary="userSalary"
            :regional-data="regionalData"
            :year="marketDataYear" />
        </div>

        <div v-if="jobListings.length" class="flex flex-col gap-2">
          <h3 class="relative text-xl md:text-2xl text-slate-900 font-bold sm:whitespace-nowrap">
            <a
              :href="$t(`sections.jobs.href.${country.toLowerCase()}`)"
              class="text-primary-500 hover:text-primary-700 transition-colors duration-500 ease-in-out"
              >{{ $t('sections.jobs.jobs') }}</a
            >
            {{ $t('sections.jobs.by-adzuna') }}
          </h3>

          <span class="text-slate-500 text-2xs uppercase">
            {{ $t('sections.jobs.caption') }}
          </span>

          <AmICarousel>
            <div
              v-for="listing in jobListings"
              :key="listing.id"
              class="w-full px-2"
              :class="{ 'md:w-1/2': jobListings.length > 1, 'lg:w-1/3': jobListings.length > 2 }">
              <AmICardRole
                :title="listing.title"
                :company="listing.company.display_name"
                :contract="listing.contract_type"
                :schedule="listing.contract_time"
                :location="listing.location.display_name"
                :salary-min="listing.salary_min"
                :salary-max="listing.salary_max"
                :user-salary="userSalary"
                :market-average="marketAverage"
                :currency-symbol="currencySymbol"
                :url="listing.redirect_url" />
            </div>
          </AmICarousel>
        </div>

        <p class="flex items-center justify-center gap-1 mt-6 text-2xs text-center text-slate-400">
          <Info class="w-3 h-3" />
          {{ $t('common.data.disclaimer') }}
        </p>
      </div>
    </div>

    <LazyModalAmbiguity
      v-if="showAmbiguityModal"
      :title="displayTitle"
      :matches="ambiguousMatches"
      @select="handleAmbiguitySelect"
      @close="showAmbiguityModal = false" />

    <ClientOnly>
      <AmILoader v-if="pending || adzunaLoading" :message="$t('common.searching')" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
// ** imports **
import { Info } from 'lucide-vue-next';
import { ref, computed, watch, onMounted } from 'vue';
import { getRawDiffPercentage } from '~/helpers/utility';

// ** data & refs **
const { $siteBrand } = useNuxtApp();
const route = useRoute();
const govId = ref((route.query.gov_id as string) || undefined);
const jobType = ref((route.query.schedule as string) || 'full-time');
const contractType = ref((route.query.contract as string) || 'permanent');
const showAmbiguityModal = ref(false);
const searchConfirmed = ref(
  (import.meta.client ? history.state?.confirmed : false) || !!govId.value || false
);
const showUserSelection = ref(false);
const userSelected = ref(false);

// 1. Destructure Adzuna from auto-imported composable
const {
  histogramBuckets,
  fetchJobs: fetchAdzunaJobs,
  fetchHistogram: fetchAdzunaHistogram,
  loading: adzunaLoading,
  histogramRange,
  histogramMaxCount,
  histogramTotalCount,
  isUnderpaid: isUnderpaidAdzuna,
  jobsCount,
  meanSalary,
  jobsData,
  hasJobsData,
  cachedGovIdCode
} = useAdzuna();

const { trackAmbiguousSearch } = useAnalytics();
const { t } = useI18n();

// 2. Destructure the NEW slimmed-down Resolver
const {
  resolving: loading, // Aliased to loading to keep UI watchers happy
  matchedTitle,
  matchedIdCode,
  isGenericFallback,
  ambiguousMatches,
  resolveUkIdentity,
  resolveUsaIdentity
} = useMarketData();

// 3. Import the NEW Data Engines
const { fetchMacroBaselines } = useMacroData();
const { fetchMicroBaselines } = useMicroData();

// Local refs to hold the strict data types from the engines
const macroResult = ref<any>(null);
const microResult = ref<any>(null);

// ** helpers **
const unslugify = (slug: string) => {
  if (!slug) return '';
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// ** computed properties **
const displayTitle = computed(() => unslugify((route.params.title as string) || 'Professional'));
const country = computed(() => (route.params.country as string)?.toUpperCase() || 'UK');
const location = computed(() =>
  route.params.location ? unslugify(route.params.location as string) : ''
);

const userSalary = ref(Number(route.query.compare) || 0);
const userPeriod = ref(route.query.period?.toString() || 'year');

// Clean title for Adzuna and display purposes
const searchTitle = ref((route.query.q as string) || displayTitle.value);

const currencySymbol = computed(() => (country.value === 'USA' ? '$' : '£'));
const adzunaCategory = computed(() => jobsData.value?.results?.[0]?.category?.label);

// ==========================================
// 🌉 THE BRIDGE: Map new data to old UI variables
// ==========================================
const marketAverage = computed(() => {
  const data = microResult.value?.microNationalData;
  return data?.mean || data?.p50 || 0;
});

const marketLow = computed(() => microResult.value?.microNationalData?.p25 || 0);
const marketHigh = computed(() => microResult.value?.microNationalData?.p75 || 0);
const marketDataYear = ref(new Date().getFullYear());

const matchedLocation = computed(() => {
  return microResult.value?.microRegionalData ? location.value : 'National';
});

const regionalData = computed(() => {
  const data = microResult.value?.microRegionalData;
  if (!data) return null;
  return {
    location: location.value,
    title: matchedTitle.value || displayTitle.value,
    salary: data.p50,
    avg_salary: data.mean,
    salary_10_pt: data.p10,
    salary_25_pt: data.p25,
    salary_75_pt: data.p75,
    salary_90_pt: data.p90
  };
});

// Original UI Computeds relying on the Bridge
const hasGovernmentData = computed(() => {
  if ((marketAverage?.value ?? 0) === 0) return false;
  if (isGenericFallback.value && displayTitle.value.toLowerCase() !== 'professional') return false;
  return true;
});

const isUnderpaid = computed<boolean>(
  () =>
    userSalary.value > 0 &&
    userSalary.value < (marketAverage?.value ?? 0) &&
    diffPercent.value < -2.5
);

const diffPercent = computed<number>(() => {
  const avg = marketAverage?.value ?? 0;
  if (userSalary.value === 0 || avg === 0) return 0;
  return getRawDiffPercentage(userSalary.value, avg);
});

const jobListings = computed(() => {
  return (jobsData.value?.results || []).sort((a: any, b: any) => {
    return b.salary_max - a.salary_max;
  });
});

const isAdminVerified = computed(() => {
  if (userSelected.value) return true;
  if (govId.value) return true;
  return !!cachedGovIdCode.value;
});

const McaScore = computed(() => {
  if (!microResult.value?.microNationalData || !macroResult.value?.macroNationalData) {
    return null;
  }

  // 1. Run the math engine (This generates the exact object you saw in your console log!)
  const rawResult =
    country.value === 'UK'
      ? calculateUKBenchmarkScore(
          userSalary.value,
          macroResult.value.macroNationalData,
          microResult.value.microNationalData,
          microResult.value.microRegionalData,
          macroResult.value.regionalMedianAllRoles,
          macroResult.value.nationalMedianAllRoles,
          histogramBuckets.value,
          histogramTotalCount.value
        )
      : calculateUSABenchmarkScore(
          userSalary.value,
          macroResult.value.macroNationalData,
          macroResult.value.macroRegionalData,
          microResult.value.microNationalData,
          microResult.value.microRegionalData,
          macroResult.value.regionalMedianAllRoles,
          macroResult.value.nationalMedianAllRoles,
          histogramBuckets.value,
          histogramTotalCount.value
        );

  // 2. THE MISSING LINK: Pass the raw math into the formatter, and return the formatted version!
  return formatMcaScoreForUi(
    rawResult,
    matchedTitle.value,
    location.value,
    t // Your Vue I18n translation function
  );
});

// ==========================================
// 🚀 ORCHESTRATOR: The 1-2 Punch Data Fetch
// ==========================================
const asyncDataKey = computed(
  () =>
    `salary-${country.value}-${location.value}-${searchTitle.value}-${userPeriod.value}-${govId.value}-${jobType.value}-${contractType.value}`
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { data, refresh, pending } = await useAsyncData(
  asyncDataKey.value,
  async () => {
    // 1. Fetch Adzuna in parallel
    await Promise.all([
      fetchAdzunaJobs(
        searchTitle.value,
        location.value,
        country.value,
        jobType.value,
        contractType.value
      ),
      fetchAdzunaHistogram(searchTitle.value, location.value, country.value)
    ]);

    const targetGovId = govId.value || cachedGovIdCode.value;

    // 2. Resolve the Identity
    if (country.value === 'UK') {
      await resolveUkIdentity(searchTitle.value, targetGovId);
    } else {
      await resolveUsaIdentity(searchTitle.value, targetGovId);
    }

    // 3. Fetch Data from the Engines using the resolved ID
    const resolvedTitle = matchedTitle.value || searchTitle.value;
    const resolvedId = matchedIdCode.value;

    const [macro, micro] = await Promise.all([
      fetchMacroBaselines(country.value, location.value),
      fetchMicroBaselines(country.value, resolvedTitle, location.value, resolvedId)
    ]);

    if (micro.officialGroupTitle) {
      matchedTitle.value = micro.officialGroupTitle;
    }

    // Save to local refs
    macroResult.value = macro;
    microResult.value = micro;

    return true;
  },
  {
    watch: [asyncDataKey],
    dedupe: 'defer',
    server: true
  }
);

// ** methods **
const handleAmbiguitySelect = async (match: any) => {
  const exactId = match.id_code || match.soc || match.objectID;

  // Updating govId triggers the asyncDataKey watcher to refresh data
  govId.value = exactId;

  trackAmbiguousSearch(match.title, match.group);

  try {
    await $fetch('/api/adzuna/update-match', {
      method: 'POST',
      body: {
        title: searchTitle.value,
        location: location.value,
        country: country.value === 'USA' ? 'us' : 'gb',
        gov_id_code: exactId,
        gov_title: match.title,
        is_automatic: false,
        job_type: jobType.value,
        contract_type: contractType.value
      }
    });
  } catch {
    return;
  }

  showAmbiguityModal.value = false;
  showUserSelection.value = false;
  userSelected.value = true;
  searchConfirmed.value = true;
};

onMounted(() => {
  const { compare, ...remainingQuery } = route.query;
  if (Object.keys(remainingQuery).length > 0) {
    navigateTo(
      { path: route.path, query: compare ? { compare: compare } : undefined },
      { replace: true }
    );
  }
});

watch(asyncDataKey, () => refresh());

// ** watchers **
watch(loading, (newLoading) => {
  if (newLoading === false) {
    const userLocation = location.value;
    const dbLocation = matchedLocation.value;

    if (
      import.meta.client &&
      hasGovernmentData.value &&
      !isGenericFallback.value &&
      matchedIdCode.value &&
      !govId.value
    ) {
      $fetch('/api/adzuna/update-match', {
        method: 'POST',
        body: {
          title: searchTitle.value,
          location: location.value,
          country: country.value === 'USA' ? 'us' : 'gb',
          gov_id_code: matchedIdCode.value,
          gov_title: matchedTitle.value,
          is_automatic: true,
          job_type: jobType.value,
          contract_type: contractType.value
        }
      }).catch(() => {});
    }

    if (
      userLocation &&
      hasGovernmentData.value &&
      dbLocation.toLowerCase() !== userLocation.toLowerCase()
    ) {
      if (dbLocation.toLowerCase() === country.value.toLowerCase()) {
        const newPath = `/benchmark/${route.params.title}/${route.params.country}`;
        navigateTo(
          { path: newPath, query: route.query, state: { ...history.state } },
          { replace: true }
        );
      }
    }
  }
});

watch(ambiguousMatches, (matches) => {
  if (matches.length > 1 && !searchConfirmed.value) {
    showAmbiguityModal.value = true;
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

// ** SEO **
const url = useRequestURL();

useSeoMeta({
  title: () => {
    const locStr = location.value ? `${location.value}, ` : '';
    return $t('meta.benchmark.location.title', {
      displayTitle: displayTitle.value,
      locStr,
      country: country.value
    });
  },
  description: () => {
    const locStr = location.value || country.value;
    return $t('meta.benchmark.location.description', { displayTitle: displayTitle.value, locStr });
  },
  ogTitle: () => {
    const locStr = location.value ? `${location.value}, ` : '';
    return $t('meta.benchmark.location.ogTitle', {
      displayTitle: displayTitle.value,
      locStr,
      country: country.value
    });
  },
  ogDescription: () => {
    const locStr = location.value || country.value;
    return $t('meta.benchmark.location.ogDescription', {
      displayTitle: displayTitle.value,
      locStr
    });
  },
  ogImage: `${url.origin}/${$siteBrand}-og.png`,
  twitterCard: 'summary',
  robots: () => {
    if (!loading.value && !adzunaLoading.value && !hasGovernmentData.value && !hasJobsData.value) {
      return 'noindex';
    }
    return 'index, follow';
  }
});

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: $t('navbar.home'), item: url.origin },
            {
              '@type': 'ListItem',
              position: 2,
              name: $t('meta.benchmark.location.header.title', {
                displayTitle: displayTitle.value
              }),
              item: `${url.origin}${route.path}`
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: displayTitle.value,
              item: `${url.origin}/benchmark/${route.params.title}/${route.params.country}`
            },
            {
              '@type': 'ListItem',
              position: 4,
              name: country.value,
              item: `${url.origin}/benchmark/${route.params.title}/${route.params.country}`
            },
            ...(location.value
              ? [
                  {
                    '@type': 'ListItem',
                    position: 5,
                    name: location.value,
                    item: `${url.origin}/salary/${route.params.title}/${route.params.country}/${route.params.location}`
                  }
                ]
              : [])
          ]
        })
      )
    }
  ]
});
</script>
