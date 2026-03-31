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

        <div class="flex flex-row gap-6">
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
        </div>

        <LazySectionNegotiation
          v-show="hasGovernmentData || hasJobsData"
          class="lg:col-span-4"
          :title="displayTitle"
          :current-salary="userSalary"
          :market-average="meanSalary || marketAverage"
          :currency-symbol="currencySymbol"
          :country="country" />

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
import { FileUser, Info } from 'lucide-vue-next';

const { $siteBrand } = useNuxtApp();
const route = useRoute();
const { isXl } = useViewport();

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
} = await useLocationEngine('salary');

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
