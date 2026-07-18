<template>
  <div
    :key="route.fullPath"
    class="min-h-screen pt-16 pb-8 bg-slate-50 flex flex-col relative gap-6 max-w-7xl mx-auto overflow-x-hidden">
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
      class="relative flex flex-col gap-6 lg:gap-8 px-4 xl:px-0 mt-2 w-full">
      <!-- 1. MCA Score -->
      <div class="w-full">
        <SectionScoreMca
          v-if="McaScore && userSalary"
          :verdict="McaScore"
          :user-salary="userSalary"
          :currency-symbol="currencySymbol"
          :matched-title="matchedTitle"
          :location="location" />
      </div>

      <!-- 2. Basic Recruiters Grid -->
      <div v-if="hasRecruiters" class="flex flex-col gap-4 mt-2 w-full">
        <div class="px-1">
          <h3 class="text-xl md:text-2xl text-slate-900 font-bold">
            {{ $t('recruiter.search-results.action-title', 'Take action now') }}
          </h3>
          <p class="text-slate-500 mt-1">
            {{ recruiterSectionTitle }}
          </p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AmIRecruiterButton
            v-for="card in recruiterCards"
            :key="card.recruiterId"
            :card="card"
            :location="location || country"
            @click="openRecruiterModal" />
        </div>
      </div>

      <!-- 3. Market Data -->
      <div class="flex flex-col md:flex-row gap-6 w-full">
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
            :market-high="marketHigh"
            :is-verified="isAdminVerified"
            @user-select="showUserSelection = true" />
        </div>

        <div
          v-if="(hasJobsData && !hasGovernmentData && !resolving && !pending) || showUserSelection"
          class="flex flex-col flex-1 min-w-0 gap-3 relative">
          <LazySectionGovernmentUserSelection
            class="flex-1 w-full"
            :adzuna-category="adzunaCategory"
            :country="country"
            @select="handleAmbiguitySelect" />
        </div>
      </div>

      <!-- 4. Job Listings (With AmICarousel Restored!) -->
      <div v-if="jobListings.length" class="w-full flex flex-col gap-3 min-w-0">
        <h3 class="relative text-xl md:text-2xl text-slate-900 font-bold sm:whitespace-nowrap px-1">
          <a
            :href="$t(`sections.jobs.href.${country.toLowerCase()}`)"
            class="text-primary-500 hover:text-primary-700 transition-colors duration-500 ease-in-out"
            >{{ $t('sections.jobs.jobs') }}</a
          >
          {{ $t('sections.jobs.by-adzuna') }}
        </h3>

        <!-- 👇 AmICarousel returns to give desktop users navigation arrows! -->
        <AmICarousel>
          <div v-for="listing in jobListings" :key="listing.id" class="w-full">
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

      <!-- 5. Action / Negotiation (Hidden if recruiter exists) -->
      <div v-if="!hasRecruiters" class="flex flex-col gap-6 w-full mt-4">
        <LazyAmICardAction
          v-if="country === 'UK' && isXl"
          bg-colour="bg-cv-library-50"
          border-colour="border-cv-library-100"
          hover-class="hover:border-cv-library-200"
          affiliate-bg-colour="bg-cv-library-100"
          affiliate-text-colour="text-cv-library-700"
          :icon="FileUser"
          :header="$t('sections.negotiation.cv-library.title')"
          :strapline="$t('sections.negotiation.cv-library.strapline')"
          sponsored
          class="rounded-lg border shadow-lg w-full flex-1">
          <template #body>
            <i18n-t
              keypath="sections.negotiation.cv-library.body-html"
              tag="span"
              class="leading-relaxed">
              <template #name>
                <strong class="text-cv-library-700">{{
                  $t('sections.negotiation.cv-library.name')
                }}</strong>
              </template>
            </i18n-t>
          </template>
          <template #cta>
            <a
              href="https://www.cv-library.co.uk/register?id=107202"
              target="_blank"
              rel="sponsored"
              class="block w-full p-3 text-center text-sm font-bold text-white bg-cv-library-700 rounded-lg hover:bg-cv-library-500 transition-colors shadow-md"
              >{{ $t('sections.negotiation.cv-library.cta') }}</a
            >
          </template>
        </LazyAmICardAction>

        <LazySectionNegotiation
          v-show="hasGovernmentData || hasJobsData"
          :title="displayTitle"
          :current-salary="userSalary"
          :market-average="meanSalary || marketAverage"
          :currency-symbol="currencySymbol"
          :country="country" />
      </div>

      <!-- 6. Disclaimer -->
      <p
        class="flex items-center justify-center gap-1 mt-4 lg:mt-12 text-2xs text-center text-slate-400">
        <Info class="w-3 h-3" />
        {{ $t('common.data.disclaimer') }}
      </p>
    </div>

    <!-- Recruiter Lead Contact Modal -->
    <div
      v-if="showRecruiterModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      @click.self="showRecruiterModal = false">
      <div class="w-full max-w-md animate-in zoom-in-95 duration-200">
        <AmICardLeadContact
          v-if="selectedRecruiter"
          :title="selectedRecruiter.title"
          :content="selectedRecruiter.categoryContent || selectedRecruiter.content"
          :brand-bg-colour="selectedRecruiter.brandBgColour"
          :brand-text-colour="selectedRecruiter.brandTextColour"
          :logo-url="selectedRecruiter.logoUrl"
          :agency-name="selectedRecruiter.agencyName"
          :button-text="selectedRecruiter.buttonText"
          :location="location || country"
          :recruiter-id="selectedRecruiter.recruiterId"
          :searched-role="searchTitle"
          show-close
          @close="showRecruiterModal = false" />
      </div>
    </div>

    <ClientOnly>
      <AmILoader v-if="pending || adzunaLoading" :message="$t('common.searching')" />
    </ClientOnly>

    <!-- Exclusive Recruiter Floating Button -->
    <div
      v-if="hasRecruiters && recruiterCards[0]?.isExclusive"
      class="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-8 fade-in duration-500">
      <AmILeadFloatingButton
        :text="getFloatingButtonText(recruiterCards[0])"
        :bg-colour="recruiterCards[0].brandBgColour"
        :text-colour="recruiterCards[0].brandTextColour"
        @click="openRecruiterModal(recruiterCards[0])" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FileUser, Info } from 'lucide-vue-next';
import { ref, computed, onMounted, watch } from 'vue';

const { $siteBrand } = useNuxtApp();
const route = useRoute();
const { isXl } = useViewport();

// 🚀 Inject the Engine
const {
  pending,
  adzunaLoading,
  resolving,
  showUserSelection,
  userSalary,
  displayTitle,
  country,
  location,
  searchTitle,
  jobType,
  contractType,
  currencySymbol,
  matchedTitle,
  matchedLocation,
  marketDataYear,
  adzunaCategory,
  hasGovernmentData,
  hasJobsData,
  McaScore,
  diffPercent,
  isUnderpaid,
  marketAverage,
  marketLow,
  marketHigh,
  jobListings,
  isAdminVerified,
  histogramBuckets,
  histogramRange,
  histogramMaxCount,
  histogramTotalCount,
  meanSalary,
  jobsCount,
  handleAmbiguitySelect,
  isUnderpaidAdzuna
} = await useLocationEngine('salary');

const { recruiterCards } = await useRecruiterCards(
  location,
  matchedLocation,
  adzunaCategory,
  'salary'
);

// 👇 New logic to completely hide distractions if a recruiter exists!
const hasRecruiters = computed(() => {
  return recruiterCards.value && recruiterCards.value.length > 0;
});

const recruiterSectionTitle = computed(() => {
  if (recruiterCards.value?.[0]?.isExclusive) {
    const cat = adzunaCategory.value || 'your industry';
    const loc = location.value || country.value || 'your region';
    return $t('recruiter.search-results.exclusive-subtitle', { category: cat, location: loc });
  }
  return $t('recruiter.search-results.basic-subtitle', 'Speak to an expert to improve your MCA');
});

const getFloatingButtonText = (card: any) => {
  const base = card.buttonText || 'Contact Us';
  const incentive = route.path.includes('/benchmark') ? 'candidates' : 'roles';
  const loc = location.value || country.value || 'their location';

  return base
    .replace(/{location}/gi, loc)
    .replace(/{agency}/gi, card.agencyName || 'our agency')
    .replace(/{incentive}/gi, incentive);
};

// Modal State Logic
const showRecruiterModal = ref(false);
const selectedRecruiter = ref<any>(null);

const openRecruiterModal = (card: any) => {
  selectedRecruiter.value = card;
  showRecruiterModal.value = true;
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

// Enrich the search log with post-search metrics once data arrives
const currentSearchId = useState<string>('currentSearchId');
const { updateSearchLog } = useUserLogging();

watch(
  [pending, adzunaLoading, currentSearchId],
  () => {
    if (pending.value || adzunaLoading.value) return;
    if (!currentSearchId.value) return;

    const hasData = hasGovernmentData.value || hasJobsData.value;

    updateSearchLog(currentSearchId.value, {
      mcaScore: typeof McaScore.value?.score === 'number' ? McaScore.value.score : null,
      marketAverage: typeof meanSalary.value === 'number' ? meanSalary.value : null,
      governmentAverage: typeof marketAverage.value === 'number' ? marketAverage.value : null,
      microPercentile: typeof McaScore.value?.microPercentile === 'number' ? McaScore.value.microPercentile : null,
      macroPercentile: typeof McaScore.value?.macroPercentile === 'number' ? McaScore.value.macroPercentile : null,
      livePercentile: typeof McaScore.value?.livePercentile === 'number' ? McaScore.value.livePercentile : null,
      searchSuccess: hasData
    });

    // Clear to prevent duplicate triggers on re-renders
    currentSearchId.value = '';
  },
  { immediate: true }
);

// ** SEO **
const url = useRequestURL();

useSeoMeta({
  title: () => {
    const locStr = location.value ? `${location.value}, ` : '';
    return $t('meta.location.title', {
      displayTitle: displayTitle.value,
      locStr,
      country: country.value
    });
  },
  description: () => {
    const locStr = location.value || country.value;
    return $t('meta.location.description', { displayTitle: displayTitle.value, locStr });
  },
  ogTitle: () => {
    const locStr = location.value ? `${location.value}, ` : '';
    return $t('meta.location.ogTitle', {
      displayTitle: displayTitle.value,
      locStr,
      country: country.value
    });
  },
  ogDescription: () => {
    const locStr = location.value || country.value;
    return $t('meta.location.ogDescription', { displayTitle: displayTitle.value, locStr });
  },
  ogImage: `${url.origin}/${$siteBrand}-og.png`,
  twitterCard: 'summary',
  robots: () => {
    if (
      !resolving.value &&
      !adzunaLoading.value &&
      !hasGovernmentData.value &&
      !hasJobsData.value
    ) {
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
              name: $t('meta.location.header.title', { displayTitle: displayTitle.value }),
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
  ]
});
</script>

<style scoped>
/* Modern utility to hide the physical scrollbar but keep native swipe functionality */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
