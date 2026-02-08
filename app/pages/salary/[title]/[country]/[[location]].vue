<template>
  <div class="min-h-screen pt-16 pb-8 bg-slate-50">
    <!-- Background Gradient (Only show if we have data) -->
    <div
      v-if="hasData"
      class="absolute top-0 left-0 w-full h-125 bg-linear-to-b to-slate-50 z-0"
      :class="
        diffPercent === 0
          ? 'from-slate-900'
          : isUnderpaid
            ? 'from-negative-900'
            : 'from-positive-900'
      "></div>

    <!-- Neutral Gradient for No Data / Loading -->
    <div
      v-else
      class="absolute top-0 left-0 w-full h-125 bg-linear-to-b from-slate-800 to-slate-50 z-0"></div>

    <div class="relative max-w-4xl px-4 mx-auto flex flex-col gap-6">
      <!-- Breadcrumbs -->
      <AmILocationBreadcrumbs
        :route="route"
        :display-title="displayTitle"
        :country="country"
        :location="location" />

      <!-- No Data Found State -->
      <LazyAmICardNoData
        v-if="!hasData"
        :title="displayTitle"
        :location="location"
        :country="country"
        :icon="Info"
        :period="userPeriod" />

      <!-- Result Headline Card (Only show if we have data) -->
      <div v-else class="overflow-hidden bg-white border shadow-xl rounded-2xl border-slate-200">
        <div class="p-6 text-center">
          <p class="mb-2 text-sm font-medium text-slate-500">
            Verdict for {{ displayTitle }} in {{ location || country }}
          </p>

          <!-- Fallback Notice -->
          <div
            v-if="
              (matchedTitle && matchedTitle.toLowerCase() !== searchTitle.toLowerCase()) ||
              (matchedLocation &&
                location &&
                matchedLocation.toLowerCase() !== location.toLowerCase())
            "
            class="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
            <Info class="w-3.5 h-3.5" />
            <span>
              Exact match not found. Showing {{ marketDataYear }} government data for
              <span class="font-bold">{{ matchedTitle }}</span>
              <span
                v-if="
                  matchedLocation &&
                  location &&
                  matchedLocation.toLowerCase() !== location.toLowerCase()
                ">
                in <span class="font-bold">{{ matchedLocation }}</span></span
              >.
            </span>
          </div>

          <!-- No Salary Input -->
          <div v-if="userSalary === 0" class="space-y-2">
            <h1 class="text-3xl font-black text-slate-900">
              Market Rate: {{ currencySymbol }}{{ marketAverage.toLocaleString() }}
            </h1>
            <p class="text-sm text-slate-500">
              You didn't enter a current salary, so we're comparing against the standard market
              average.
            </p>
          </div>

          <!-- Spot On / Fairly Paid -->
          <div v-else-if="diffPercent === 0" class="flex flex-col items-center space-y-3">
            <AmIChip :icon="Check" bg-colour="bg-indigo-100" text-colour="text-indigo-700">
              Fairly Paid
            </AmIChip>
            <div>
              <h2 class="text-4xl font-black text-slate-900">Spot on!</h2>
              <p class="text-sm text-slate-600 mt-1">
                Your salary is
                <span class="font-bold text-slate-900">exactly in line</span> with the market
                average.
              </p>
            </div>
          </div>

          <!-- Underpaid -->
          <div v-else-if="isUnderpaid" class="flex flex-col items-center space-y-3">
            <AmIChip
              :icon="TrendingDown"
              bg-colour="bg-negative-100"
              text-colour="text-negative-700">
              Underpaid
            </AmIChip>
            <div>
              <h2 class="text-4xl font-black text-slate-900">Underpaid by {{ diffPercent }}%</h2>
              <p class="text-sm text-slate-600 mt-1">
                Typical {{ matchedTitle || displayTitle }}s in
                {{ matchedLocation || location || country }} earn
                <span class="font-bold text-slate-900"
                  >{{ currencySymbol }}{{ marketAverage.toLocaleString() }}</span
                >.
              </p>
            </div>
          </div>

          <!-- Above Average -->
          <div v-else class="flex flex-col items-center space-y-3">
            <AmIChip :icon="TrendingUp" bg-colour="bg-positive-100" text-colour="text-positive-700">
              Above Market Average
            </AmIChip>
            <div>
              <h2 class="text-4xl font-black text-slate-900">You're doing great!</h2>
              <p class="text-sm text-slate-600 mt-1">
                Your salary is
                <span class="font-bold text-slate-900">{{ diffPercent }}% higher</span> than the
                market average for your role.
              </p>
            </div>
          </div>
        </div>

        <!-- Comparison Visualizer -->
        <div class="px-6 py-5 border-t bg-slate-50 border-slate-200">
          <div class="relative pt-8 pb-2">
            <!-- Range Bar -->
            <div class="relative h-3 rounded-full bg-slate-200">
              <!-- High/Low Markers -->
              <div class="absolute left-0 -top-6 text-[10px] font-bold text-slate-400 uppercase">
                Low
              </div>
              <div class="absolute right-0 -top-6 text-[10px] font-bold text-slate-400 uppercase">
                High
              </div>

              <!-- Market Average Dot -->
              <div
                class="absolute z-10 w-5 h-5 -translate-x-1/2 -translate-y-1/2 bg-primary-600 border-[3px] border-white rounded-full shadow-md top-1/2 left-1/2">
                <div
                  class="absolute -translate-x-1/2 -top-6 left-1/2 text-[9px] font-black text-primary-600 whitespace-nowrap">
                  AVG
                </div>
              </div>

              <!-- User Salary Marker -->
              <div
                v-if="userSalary > 0 && marketHigh > 0"
                class="absolute z-20 w-1 h-8 transition-all duration-1000 -translate-y-1/2 top-1/2"
                :class="
                  diffPercent === 0
                    ? 'bg-slate-600'
                    : isUnderpaid
                      ? 'bg-negative-700'
                      : 'bg-positive-700'
                "
                :style="{ left: `${salaryPosition}%` }">
                <div
                  class="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black whitespace-nowrap"
                  :class="
                    diffPercent === 0
                      ? 'text-slate-600'
                      : isUnderpaid
                        ? 'text-negative-700'
                        : 'text-positive-700'
                  ">
                  YOU
                </div>
              </div>
            </div>
          </div>

          <!-- Key Stats Row -->
          <div class="flex justify-between mt-6 text-xs">
            <div class="text-center">
              <span class="font-bold text-slate-500"
                >{{ currencySymbol }}{{ marketLow.toLocaleString() }}</span
              >
            </div>
            <div class="text-center">
              <span class="font-bold text-primary-600"
                >{{ currencySymbol }}{{ marketAverage.toLocaleString() }}</span
              >
            </div>
            <div class="text-center">
              <span class="font-bold text-slate-500"
                >{{ currencySymbol }}{{ marketHigh.toLocaleString() }}</span
              >
            </div>
          </div>
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
        v-if="hasData"
        class="lg:col-span-4"
        :title="displayTitle"
        :current-salary="userSalary"
        :market-average="marketAverage"
        :currency-symbol="currencySymbol"
        :country="country" />

      <p class="flex items-center justify-center gap-1 mt-6 text-[10px] text-center text-slate-400">
        <Info class="w-3 h-3" />
        Data based on recent listings from Adzuna and ONS Benchmarks.
      </p>

      <!-- Ambiguity Modal -->
      <LazyModalAmbiguity
        v-if="showAmbiguityModal"
        :title="displayTitle"
        :matches="ambiguousMatches"
        @select="handleAmbiguitySelect"
        @close="showAmbiguityModal = false" />
    </div>

    <!-- Loading State -->
    <AmILoader v-if="loading" message="Searching 140,000+ records..." />
  </div>
</template>

<script setup lang="ts">
// ** imports **
import { TrendingDown, TrendingUp, Info, Check } from 'lucide-vue-next';
import { computed, onMounted, watch } from 'vue';

// ** data & refs **
const route = useRoute();
const showAmbiguityModal = ref(false);
const searchConfirmed = ref(false);

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
const hasData = computed(() => {
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
  return Math.abs(Math.round(((userSalary.value - avg) / avg) * 100));
});

// Safe percentage for the progress bar relative to the Low-High range
const salaryPosition = computed<number>(() => {
  const high = marketHigh?.value ?? 0;
  const low = marketLow?.value ?? 0;
  const range = high - low;
  if (range <= 0) return 50;

  const offset = userSalary.value - low;
  const pct = (offset / range) * 100;

  return Math.min(Math.max(pct, 0), 100);
});

const fetchData = (t: string, l: string, c: string, p: string) => {
  if (c === 'UK') {
    fetchUkMarketData(t, l, p);
  } else {
    fetchUSAMarketData(t, l, p);
  }
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
    if (userLocation && hasData.value && dbLocation.toLowerCase() !== userLocation.toLowerCase()) {
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
