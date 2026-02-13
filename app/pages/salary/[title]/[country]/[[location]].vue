<template>
  <div class="min-h-screen pt-16 pb-8 bg-slate-50 flex flex-col relative gap-6">
    <!-- Background Gradient (Only show if we have data) -->
    <div
      class="absolute top-0 left-0 w-full h-125 bg-linear-to-b to-slate-50 z-0"
      :class="
        diffPercent === 0
          ? 'from-slate-900'
          : isUnderpaid
            ? 'from-negative-900'
            : 'from-positive-900'
      "></div>

    <!-- Breadcrumbs -->
    <AmILocationBreadcrumbs
      class="relative"
      :route="route"
      :display-title="displayTitle"
      :country="country"
      :location="location" />

    <h1 class="relative text-4xl font-white text-center font-bold">{{ displayTitle }}</h1>

    <LazyAmICardNoData
      v-if="!hasGovernmentData && !hasJobsData"
      :title="displayTitle"
      :location="location"
      :country="country"
      :icon="Info"
      :period="userPeriod" />

    <div v-else class="relative grid grid-cols-1 px-4 gap-6">
      <div class="relative mx-auto flex flex-col gap-6">
        <!-- Adzuna results section -->
        <div class="flex flex-col gap-6 xl:flex-row">
          <div v-if="hasJobsData" class="flex flex-col flex-1 gap-3 adzuna-section">
            <div class="flex items-center gap-2">
              <div class="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
                <TrendingUp class="w-4 h-4" />
              </div>
              <h3 class="font-bold text-slate-900">Live Market Analysis</h3>
            </div>
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
              @fetch-data="fetchAdzunaHistogram(searchTitle, location, country)" />
          </div>

          <!-- GovernmentSection -->
          <div v-if="hasGovernmentData" class="flex flex-col flex-1 gap-3 government-section">
            <div class="flex items-center gap-2">
              <div class="p-1.5 bg-slate-100 rounded-lg text-slate-600">
                <Landmark class="w-4 h-4" />
              </div>
              <h3 class="font-bold text-slate-900">Government Benchmarks</h3>
            </div>
            <LazySectionGovernmentComparison
              class="overflow-hidden"
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
          </div>
        </div>

        <!-- Regional Comparison Card (UK Only) -->
        <LazySectionUKComparison
          v-if="country === 'UK' && regionalData && location"
          :country="country"
          :location="location"
          :display-title="matchedTitle || displayTitle"
          :market-average="marketAverage"
          :user-salary="userSalary"
          :regional-data="regionalData"
          :year="marketDataYear" />

        <!-- The Negotiation Component -->
        <LazySectionNegotiation
          v-if="hasGovernmentData"
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

      <!-- <LazyAmICardAction
        v-if="country === 'UK' && hasGovernmentData && isXl"
        bg-colour="bg-cv-library-50"
        border-colour="border-cv-library-100"
        hover-class="hover:border-cv-library-200"
        affiliate-bg-colour="bg-cv-library-100"
        affiliate-text-colour="text-cv-library-700"
        :icon="FileUser"
        header="Get Discovered"
        strapline="Find a job that works for you, fast"
        sponsored
        class="rounded-lg border shadow-lg h-max xl:col-span-2 xl:w-full">
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
      </LazyAmICardAction> -->
    </div>

    <!-- Ambiguity Modal -->
    <LazyModalAmbiguity
      v-if="showAmbiguityModal"
      :title="displayTitle"
      :matches="ambiguousMatches"
      @select="handleAmbiguitySelect"
      @close="showAmbiguityModal = false" />

    <!-- Loading State -->
    <AmILoader v-if="loading" message="Searching 140,000+ records..." />
  </div>
</template>

<script setup lang="ts">
// ** imports **
import { get } from 'firebase/database';
import { Info, TrendingUp, Landmark } from 'lucide-vue-next';
import { computed, onMounted, watch } from 'vue';
import { getDiffPercentage } from '~/helpers/utility';

// ** data & refs **
const route = useRoute();
const showAmbiguityModal = ref(false);
const searchConfirmed = ref(false);
const {
  distributionData,
  jobsData,
  histogramBuckets,
  fetchJobs: fetchAdzunaJobs,
  fetchHistogram: fetchAdzunaHistogram,
  loading: adzunaLoading,
  histogramRange,
  histogramMaxCount,
  histogramTotalCount,
  isUnderpaid: isUnderpaidAdzuna,
  meanSalary,
  hasJobsData
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
const searchTitle = ref((route.query.q as string) || displayTitle.value);
const currencySymbol = computed(() => (country.value === 'USA' ? '$' : '£'));

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

const fetchData = (t: string, l: string, c: string, p: string) => {
  Promise.all([
    c === 'UK' ? fetchUkMarketData(t, l, p) : fetchUSAMarketData(t, l, p),
    fetchAdzunaJobs(t, l, c)
  ])
    .then((values) => {
      const [marketData] = values;

      console.log('Market Data:', marketData);
      console.log('Adzuna Jobs Data:', jobsData.value);
      // Handle the data as needed after both promises resolve
    })
    .catch((error) => {
      console.error('Error fetching data:', error);
    });
};

// ** methods **
const handleAmbiguitySelect = (match: any) => {
  const specificTitle = match.group ? `${match.title} (${match.group})` : match.title;

  // gtag track for ambiguity selection
  trackAmbiguousSearch(match.title, match.group);

  // Re-fetch with specific group, but keep URL clean
  fetchData(specificTitle, location.value, country.value, userPeriod.value);
  showAmbiguityModal.value = false;
};

// ** lifecycle **
onMounted(() => {
  // Check history state for cleaner navigation data (passed from search)
  if (history.state) {
    if (history.state.q) searchTitle.value = String(history.state.q);
    if (history.state.compare) userSalary.value = Number(history.state.compare);
    if (history.state.period) userPeriod.value = String(history.state.period);
    if (history.state.confirmed) searchConfirmed.value = true;
  }

  fetchData(searchTitle.value, location.value, country.value, userPeriod.value);
});

// ** watchers **
watch(loading, (newLoading) => {
  // When data fetching is complete
  if (newLoading === false) {
    const userLocation = location.value;
    const dbLocation = matchedLocation.value;

    // Redirect if user searched for a location, but we only found national data.
    // This keeps the URL canonical and improves SEO.
    if (
      userLocation &&
      hasGovernmentData.value &&
      dbLocation.toLowerCase() !== userLocation.toLowerCase()
    ) {
      // Check if the found location is the country itself (a national fallback)
      if (dbLocation.toLowerCase() === country.value.toLowerCase()) {
        const newPath = `/salary/${route.params.title}/${route.params.country}`;
        navigateTo(
          {
            path: newPath,
            query: route.query, // Preserve compare/period params
            state: { ...history.state } // Preserve confirmed flag so modal doesn't reappear
          },
          { replace: true } // Use replace to avoid a broken back button history
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

watch(distributionData, () => {
  console.log('Distribution data updated:', distributionData.value);
});
watch(jobsData, () => {
  console.log('Jobs data updated:', jobsData.value);
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
  twitterCard: 'summary'
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
