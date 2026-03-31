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
          v-if="McaScore && userSalary"
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
            v-if="
              (hasJobsData && !hasGovernmentData && !resolving && !pending) || showUserSelection
            "
            class="flex flex-col flex-1 min-w-0 gap-3 relative">
            <LazySectionGovernmentUserSelection
              class="flex-1 w-full"
              :adzuna-category="adzunaCategory"
              :country="country"
              @select="handleAmbiguitySelect" />
          </div>
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

const { $siteBrand } = useNuxtApp();
const route = useRoute();

// 🚀 Inject the Engine
const {
  pending,
  adzunaLoading,
  resolving,
  showAmbiguityModal,
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
  ambiguousMatches,
  handleAmbiguitySelect,
  isUnderpaidAdzuna
} = await useLocationEngine('benchmark');

onMounted(() => {
  const { compare, ...remainingQuery } = route.query;
  if (Object.keys(remainingQuery).length > 0) {
    navigateTo(
      { path: route.path, query: compare ? { compare: compare } : undefined },
      { replace: true }
    );
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
