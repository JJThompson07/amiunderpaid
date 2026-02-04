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

    <div class="relative max-w-3xl px-4 mx-auto">
      <!-- Back Link -->
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 my-4 text-sm font-semibold transition-colors text-slate-200 hover:text-slate-50">
        <ArrowLeft class="w-4 h-4" />
        Back to search
      </NuxtLink>

      <!-- Loading State -->
      <div
        v-if="loading"
        class="flex items-center justify-center h-64 bg-white rounded-2xl shadow-xl">
        <div class="flex flex-col items-center gap-4">
          <div
            class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-sm font-medium text-slate-500">Searching 140,000+ records...</p>
        </div>
      </div>

      <!-- No Data Found State -->
      <AmICardNoData
        v-else-if="!hasData"
        :title="title"
        :location="location"
        :country="country"
        :icon="Info"
        :period="userPeriod" />

      <!-- Result Headline Card (Only show if we have data) -->
      <div
        v-else
        class="mb-6 overflow-hidden bg-white border shadow-xl rounded-2xl border-slate-200">
        <div class="p-6 text-center">
          <p class="mb-2 text-sm font-medium text-slate-500">
            Verdict for {{ title }} in {{ location || country }}
          </p>

          <!-- Fallback Notice -->
          <div
            v-if="
              (matchedTitle && matchedTitle.toLowerCase() !== title.toLowerCase()) ||
              (matchedLocation &&
                location &&
                matchedLocation.toLowerCase() !== location.toLowerCase())
            "
            class="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
            <Info class="w-3.5 h-3.5" />
            <span>
              Exact match not found. Showing government data for
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
                Your salary is <span class="font-bold text-slate-900">exactly in line</span> with
                the market average.
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
                Typical {{ matchedTitle || title }}s in
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

          <!-- Historical Trend Section -->
          <div
            v-if="marketLastYear > 0"
            class="flex flex-col items-center justify-between pt-4 mt-4 border-t md:flex-row border-slate-200/60">
            <div class="flex items-center gap-3">
              <div class="p-1.5 rounded-lg bg-indigo-50 text-secondary-600">
                <History class="w-4 h-4" />
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase text-slate-400">Year over Year</p>
                <p class="text-sm font-medium text-slate-900">
                  Salaries are
                  <span
                    class="font-bold"
                    :class="isTrendUp ? 'text-emerald-600' : 'text-negative-600'">
                    {{ isTrendUp ? 'up' : 'down' }} {{ trendPercent }}%
                  </span>
                  since {{ marketDataYear - 1 }}
                </p>
              </div>
            </div>
            <div class="mt-2 text-right md:mt-0">
              <p class="text-[10px] font-bold uppercase text-slate-400">
                {{ marketDataYear - 1 }} Average
              </p>
              <p class="text-sm font-bold text-slate-500">
                {{ currencySymbol }}{{ marketLastYear.toLocaleString() }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- The Negotiation Component -->
      <SectionNegotiation
        v-if="hasData"
        :title="title"
        :current-salary="userSalary"
        :market-average="marketAverage"
        :currency-symbol="currencySymbol"
        @close="showModal = false" />
      <!-- Negotiation / Next Steps Card (Only if data exists) -->
      <!-- <div
        v-if="!loading && hasData"
        class="flex flex-col items-center gap-4 p-6 text-white bg-secondary-600 shadow-xl rounded-2xl md:flex-row shadow-secondary-200">
        <div class="flex-1 space-y-1 text-center md:text-left">
          <h3 class="text-lg font-bold">Ready to take action?</h3>
          <p class="text-xs text-secondary-100 opacity-90">
            Get a personalized action plan, including negotiation scripts and CV tips for
            {{ title }} roles.
          </p>
        </div>
        <AmIButton
          bg-colour="bg-white"
          text-colour="text-secondary-600"
          animation-colour="bg-secondary-200"
          class="shrink-0"
          @click="showModal = true">
          Get Action Plan
        </AmIButton>
      </div> -->

      <p class="flex items-center justify-center gap-1 mt-6 text-[10px] text-center text-slate-400">
        <Info class="w-3 h-3" />
        Data based on recent listings from Adzuna and ONS Benchmarks.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// ** imports **
import { ArrowLeft, TrendingDown, TrendingUp, Info, History, Check } from 'lucide-vue-next';
import { ref, computed, onMounted } from 'vue';

// ** type definitions **

// ** props **

// ** emits **

// ** data & refs **
const route = useRoute();
const showModal = ref(false);

// Destructure market data from auto-imported composable
const {
  loading,
  marketAverage,
  marketHigh,
  marketLow,
  marketLastYear,
  marketDataYear,
  matchedTitle,
  matchedLocation,
  isGenericFallback,
  fetchMarketData
} = useMarketData();

// ** computed properties **
const title = computed<string>(() => route.query.title?.toString() || 'Professional');
const location = computed<string>(() => route.query.loc?.toString() || '');
const country = computed<string>(() => route.query.country?.toString() || 'UK');
const userSalary = computed<number>(() => Number(route.query.sal) || 0);

const currencySymbol = computed(() => (country.value === 'USA' ? '$' : '£'));
const userPeriod = computed<string>(() => route.query.period?.toString() || 'year');

// Strict Data Check:
// Has data IF average > 0 AND (it's not a generic fallback OR the user explicitly searched for "Professional")
const hasData = computed(() => {
  if ((marketAverage?.value ?? 0) === 0) return false;
  // If we found a generic "Professional" record but the user searched for something specific, treat as NO DATA.
  if (isGenericFallback.value && title.value.toLowerCase() !== 'professional') return false;
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

  // Calculate offset from the bottom of the range (Market Low)
  const offset = userSalary.value - low;
  const pct = (offset / range) * 100;

  // Clamp between 0% (Market Low) and 100% (Market High)
  return Math.min(Math.max(pct, 0), 100);
});

const trendPercent = computed<number>(() => {
  const lastYear = marketLastYear?.value ?? 0;
  const avg = marketAverage?.value ?? 0;
  if (lastYear === 0) return 0;
  return Math.abs(Math.round(((avg - lastYear) / lastYear) * 100));
});

const isTrendUp = computed<boolean>(
  () => (marketAverage?.value ?? 0) >= (marketLastYear?.value ?? 0)
);

// ** methods **

// ** lifecycle **
onMounted(() => {
  fetchMarketData(title.value, location.value, country.value, userPeriod.value);
});

// ** watchers **
</script>
