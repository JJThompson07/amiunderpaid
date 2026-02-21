<template>
  <div
    :key="route.fullPath"
    class="min-h-screen pt-16 pb-8 bg-slate-50 flex flex-col relative gap-6">
    <div
      class="fixed top-0 left-0 w-full h-125 bg-linear-to-b to-slate-50 z-0 from-secondary-900"></div>

    <AmILocationBreadcrumbs
      class="relative"
      :route="route"
      :display-title="displayTitle"
      :country="country"
      :location="location" />

    <h1 class="relative text-3xl md:text-6xl text-white font-bold px-4">{{ displayTitle }}</h1>

    <LazySectionNoData
      v-if="!pending && !adzunaLoading && !hasGovernmentData && !hasJobsData"
      :title="displayTitle"
      :location="location"
      :country="country"
      @select="handleAmbiguitySelect" />

    <div
      v-show="!pending && (hasGovernmentData || hasJobsData)"
      class="relative grid grid-cols-1 px-4 gap-6">
      <div class="relative mx-auto flex flex-col gap-6">
        <div class="flex flex-col gap-6 xl:flex-row">
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
              :jobs-count="jobsCount"
              @fetch-data="fetchAdzunaHistogram(searchTitle, location, country)" />
          </div>

          <div
            v-if="hasGovernmentData && !showUserSelection"
            class="flex flex-col flex-1 min-w-0 gap-3 government-section relative">
            <LazySectionGovernmentComparison
              class="overflow-hidden flex-1"
              :is-fallback="!hasJobsData"
              :display-title="displayTitle"
              :location="location"
              :country="country"
              :user-salary="userSalary"
              :market-average="marketAverage"
              :currency-symbol="currencySymbol"
              :matched-title="matchedTitle"
              :matched-location="matchedLocation"
              :search-title="searchTitle"
              :market-data-year="marketDataYear"
              :diff-percent="diffPercent"
              :is-underpaid="isUnderpaid"
              :market-low="marketLow"
              :market-high="marketHigh" />
            <AmIButton
              v-if="!userSelected && !showUserSelection"
              class="absolute! right-2 top-2 text-2xs shadow-md"
              @click="showUserSelection = true"
              >Not the best match?</AmIButton
            >
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

        <SectionUKComparison
          v-show="country === 'UK' && regionalData && location"
          :country="country"
          :location="location"
          :display-title="matchedTitle || displayTitle"
          :market-average="marketAverage"
          :user-salary="userSalary"
          :regional-data="regionalData"
          :year="marketDataYear" />

        <LazyAmICardAction
          v-if="country === 'UK' && isXl"
          bg-colour="bg-cv-library-50"
          border-colour="border-cv-library-100"
          hover-class="hover:border-cv-library-200"
          affiliate-bg-colour="bg-cv-library-100"
          affiliate-text-colour="text-cv-library-700"
          :icon="FileUser"
          header="Get Discovered"
          strapline="Find a job that works for you, fast"
          sponsored
          class="rounded-lg border shadow-lg h-max w-full">
          <template #body>
            Register your free CV on the UK's leading job site (<strong class="text-cv-library-700"
              >CV-Library</strong
            >) and let top employers come to you - it's fast, easy and free.
          </template>
          <template #cta>
            <a
              href="https://www.cv-library.co.uk/register?id=107202"
              target="_blank"
              rel="sponsored"
              class="block w-full p-3 text-center text-sm font-bold text-white bg-cv-library-700 rounded-lg hover:bg-cv-library-500 transition-colors shadow-md"
              >Register CV</a
            >
          </template>
        </LazyAmICardAction>

        <LazySectionNegotiation
          v-show="hasGovernmentData || hasJobsData"
          class="lg:col-span-4"
          :title="displayTitle"
          :current-salary="userSalary"
          :market-average="marketAverage"
          :currency-symbol="currencySymbol"
          :country="country" />

        <p class="flex items-center justify-center gap-1 mt-6 text-2xs text-center text-slate-400">
          <Info class="w-3 h-3" />
          Data based on recent listings from Adzuna and ONS Benchmarks.
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
      <AmILoader v-if="pending || adzunaLoading" message="Searching 140,000+ records..." />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
// ** imports **
import { FileUser, Info } from 'lucide-vue-next';
import { ref, computed, watch } from 'vue';
import { getDiffPercentage } from '~/helpers/utility';

// ** data & refs **
const route = useRoute();
const govId = ref((route.query.gov_id as string) || undefined);
const showAmbiguityModal = ref(false);
const searchConfirmed = ref(
  (import.meta.client ? history.state?.confirmed : false) || !!govId.value || false
);
const showUserSelection = ref(false);
const userSelected = ref(false);

const { isXl } = useViewport();

// Destructure Adzuna from auto-imported composable
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
  cachedGovIdCode // Now used to bypass Algolia sequentially
} = useAdzuna();

const { trackAmbiguousSearch } = useAnalytics();

// Destructure market data from auto-imported composable
const {
  loading,
  marketAverage,
  marketHigh,
  marketLow,
  marketDataYear,
  matchedTitle,
  matchedLocation,
  matchedIdCode,
  isGenericFallback,
  ambiguousMatches,
  regionalData,
  fetchUkMarketData,
  fetchUSAMarketData
} = useMarketData();

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

// Strict Data Check:
const hasGovernmentData = computed(() => {
  if ((marketAverage?.value ?? 0) === 0) return false;
  if (isGenericFallback.value && displayTitle.value.toLowerCase() !== 'professional') return false;
  return true;
});

const isUnderpaid = computed<boolean>(
  () => userSalary.value > 0 && userSalary.value < (marketAverage?.value ?? 0)
);

const diffPercent = computed<number>(() => {
  const avg = marketAverage?.value ?? 0;
  if (userSalary.value === 0 || avg === 0) return 0;
  return getDiffPercentage(userSalary.value, avg);
});

// 1. Create a unique key for caching based on all parameters
const asyncDataKey = computed(
  () =>
    `salary-${country.value}-${location.value}-${searchTitle.value}-${userPeriod.value}-${govId.value}`
);

// 2. Use useAsyncData to fetch sequentially
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { data, refresh, pending } = await useAsyncData(asyncDataKey.value, async () => {
  // Wait for Adzuna first to check for cached IDs
  await fetchAdzunaJobs(searchTitle.value, location.value, country.value);

  // Determine the ID to pass to Algolia (User URL param > Cached DB Param > undefined)
  const targetGovId = govId.value || cachedGovIdCode.value;

  // Fetch Government Match
  if (country.value === 'UK') {
    await fetchUkMarketData(searchTitle.value, location.value, userPeriod.value, targetGovId);
  } else {
    await fetchUSAMarketData(searchTitle.value, location.value, userPeriod.value, targetGovId);
  }

  return true;
});

// ** methods **
const handleAmbiguitySelect = async (match: any) => {
  const exactId = match.id_code || match.soc || match.objectID;
  govId.value = exactId;

  trackAmbiguousSearch(match.title, match.group);

  // Log user's manual correction securely
  try {
    await $fetch('/api/adzuna/update-match', {
      method: 'POST',
      body: {
        title: searchTitle.value,
        location: location.value,
        country: country.value === 'USA' ? 'us' : 'gb',
        gov_id_code: exactId,
        is_automatic: false
      }
    });
  } catch (err) {
    console.error('Failed to log manual match suggestion', err);
  }

  if (country.value === 'UK') {
    fetchUkMarketData(searchTitle.value, location.value, userPeriod.value, exactId);
  } else {
    fetchUSAMarketData(searchTitle.value, location.value, userPeriod.value, exactId);
  }

  showAmbiguityModal.value = false;
  showUserSelection.value = false;
  userSelected.value = true;
  searchConfirmed.value = true;
};

watch(asyncDataKey, () => refresh());

// ** watchers **
watch(loading, (newLoading) => {
  if (newLoading === false) {
    const userLocation = location.value;
    const dbLocation = matchedLocation.value;

    // Securely log automatic matches for admin review/approval
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
          is_automatic: true
        }
      }).catch((err) => console.error('Silent background suggestion log failed', err));
    }

    if (
      userLocation &&
      hasGovernmentData.value &&
      dbLocation.toLowerCase() !== userLocation.toLowerCase()
    ) {
      if (dbLocation.toLowerCase() === country.value.toLowerCase()) {
        const newPath = `/salary/${route.params.title}/${route.params.country}`;
        navigateTo(
          {
            path: newPath,
            query: route.query,
            state: { ...history.state }
          },
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

// ** SEO **
const url = useRequestURL();

useSeoMeta({
  title: () => {
    const locStr = location.value ? `${location.value}, ` : '';
    return `Average ${displayTitle.value} Salary in ${locStr}${country.value} | Am I Underpaid?`;
  },
  description: () => {
    const locStr = location.value || country.value;
    return `Find out the average ${displayTitle.value} salary in ${locStr}. Compare your pay against live market data and government benchmarks.`;
  },
  ogTitle: () => {
    const locStr = location.value ? `${location.value}, ` : '';
    return `Average ${displayTitle.value} Salary in ${locStr}${country.value}`;
  },
  ogDescription: () => {
    const locStr = location.value || country.value;
    return `Are you being paid enough? Check the average ${displayTitle.value} salary in ${locStr} now.`;
  },
  ogImage: `${url.origin}/og.png`,
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
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: url.origin
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: `Salary for ${displayTitle.value}`,
              item: `${url.origin}${route.path}`
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: displayTitle.value,
              item: `${url.origin}/salary/${route.params.title}/${route.params.country}`
            },
            {
              '@type': 'ListItem',
              position: 4,
              name: country.value,
              item: `${url.origin}/salary/${route.params.title}/${route.params.country}`
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
  ],
  link: [{ rel: 'canonical', href: `${url.origin}${route.path}` }]
});
</script>
