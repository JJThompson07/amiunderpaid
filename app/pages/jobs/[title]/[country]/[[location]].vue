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
      :location="location"
      base-path="/jobs" />

    <div class="flex flex-wrap gap-2 justify-between items-end">
      <h1 class="relative text-3xl md:text-6xl text-white font-bold px-4 sm:whitespace-nowrap">
        {{ displayTitle }}
      </h1>
      <h2
        v-if="hasJobsData"
        class="relative sm:text-lg md:text-xl text-white font-bold px-4 sm:whitespace-nowrap">
        {{ $t('sections.jobs.count', { count: jobsCount }) }}
      </h2>
    </div>

    <div class="px-4">
      <BaseSearchForm mode="jobs" />
    </div>

    <AmICardNoData
      v-if="!pending && !loading && !hasJobsData"
      class="mx-4"
      :title="displayTitle"
      :location="location"
      :country="country"
      :heading="t('sections.jobs.no-results.heading')"
      :body="t('sections.jobs.no-results.body')"
      :show-button="false" />

    <div v-show="!pending && hasJobsData" class="relative flex flex-col gap-6 px-4 xl:px-0 mt-2">
      <div v-if="hasJobsData" class="flex flex-wrap gap-3 justify-between items-center">
        <NuxtLink
          :to="`/salary/${route.params.title}/${route.params.country}${location ? `/${route.params.location}` : ''}`"
          class="inline-flex items-center gap-2 w-fit px-4 py-2.5 text-sm font-medium text-primary-900 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 hover:border-primary-300 transition-all duration-300">
          {{ $t('sections.jobs.view-salary-benchmark', { displayTitle }) }}
        </NuxtLink>

        <AmITabs
          v-model="sortMode"
          :options="sortOptions"
          bg-colour="bg-slate-200"
          text-colour="text-slate-500"
          hover-colour="hover:text-primary-400"
          button-colour="bg-primary-500"
          button-text-colour="text-white" />
      </div>

      <div v-if="sortedExactListings.length" class="flex flex-col gap-3">
        <h3 class="text-xl md:text-2xl text-slate-900 font-bold px-1">
          {{ $t('sections.jobs.tier.exact') }}
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AmICardRole
            v-for="listing in sortedExactListings"
            :key="listing.id"
            :title="listing.title"
            :company="listing.company.display_name"
            :contract="listing.contract_type"
            :schedule="listing.contract_time"
            :description="listing.description"
            :location="listing.location.display_name"
            :salary-min="listing.salary_min"
            :salary-max="listing.salary_max"
            :raw-salary="listing.raw_salary"
            :currency-symbol="currencySymbol"
            :url="listing.redirect_url" />
        </div>
      </div>

      <div v-if="sortedSimilarListings.length" class="flex flex-col gap-3">
        <h3 class="text-xl md:text-2xl text-slate-900 font-bold px-1">
          {{ $t('sections.jobs.tier.similar') }}
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AmICardRole
            v-for="listing in sortedSimilarListings"
            :key="listing.id"
            :title="listing.title"
            :company="listing.company.display_name"
            :contract="listing.contract_type"
            :schedule="listing.contract_time"
            :description="listing.description"
            :location="listing.location.display_name"
            :salary-min="listing.salary_min"
            :salary-max="listing.salary_max"
            :raw-salary="listing.raw_salary"
            :currency-symbol="currencySymbol"
            :url="listing.redirect_url" />
        </div>
      </div>

      <!-- Take Action / Recruiters Grid -->
      <div v-if="hasRecruiters" class="flex flex-col gap-4 mt-2 w-full">
        <div class="px-1">
          <h3 class="text-xl md:text-2xl text-slate-900 font-bold">
            {{ $t('recruiter.search-results.action-title', 'Take action now') }}
          </h3>
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
    </div>

    <!-- Recruiter Lead Contact Modal -->
    <div
      v-if="showRecruiterModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      @click.self="showRecruiterModal = false">
      <div class="w-full max-w-md animate-in zoom-in-95 duration-200">
        <AmICardLeadContact
          v-if="selectedRecruiter"
          :title="selectedRecruiter.title ?? undefined"
          :content="selectedRecruiter.categoryContent || selectedRecruiter.content || undefined"
          :brand-bg-colour="selectedRecruiter.brandBgColour"
          :brand-text-colour="selectedRecruiter.brandTextColour"
          :logo-url="selectedRecruiter.logoUrl ?? undefined"
          :agency-name="selectedRecruiter.agencyName ?? undefined"
          :button-text="selectedRecruiter.buttonText"
          :location="location || country"
          :recruiter-id="selectedRecruiter.recruiterId"
          :searched-role="searchTitle"
          show-close
          @close="showRecruiterModal = false" />
      </div>
    </div>

    <ClientOnly>
      <AmILoader v-if="pending || loading" :message="$t('common.searching')" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { RecruiterCard } from '~~/shared/utils/types';

const route = useRoute();
const { t } = useI18n();
const { $siteBrand } = useNuxtApp();

const {
  pending,
  loading,
  displayTitle,
  country,
  location,
  searchTitle,
  sortMode,
  sortedExactListings,
  sortedSimilarListings,
  hasJobsData,
  jobsCount,
  adzunaCategory
} = await useJobSearchEngine();

// Called here rather than inside useJobSearchEngine: useRecruiterCards() calls
// useRoute() internally, and calling it after a composable's own internal
// `await useAsyncData(...)` loses Nuxt's async instance context (only a
// page/component's top-level <script setup> keeps that across awaits) --
// mirrors the salary/benchmark pages' established pattern.
const { recruiterCards } = await useRecruiterCards(
  location,
  location,
  adzunaCategory,
  country,
  'jobs'
);

const currencySymbol = computed<string>(() => (country.value === 'USA' ? '$' : '£'));

const sortOptions = computed(() => [
  { label: t('sections.jobs.sort.relevance'), value: 'relevance' },
  { label: t('sections.jobs.sort.salary_max'), value: 'salary_max' },
  { label: t('sections.jobs.sort.salary_min'), value: 'salary_min' }
]);

const hasRecruiters = computed(() => recruiterCards.value && recruiterCards.value.length > 0);

const showRecruiterModal = ref(false);
const selectedRecruiter = ref<RecruiterCard | null>(null);

const openRecruiterModal = (card: RecruiterCard): void => {
  selectedRecruiter.value = card;
  showRecruiterModal.value = true;
};

// ** SEO **
const url = useRequestURL();

useSeoMeta({
  title: () => {
    const locStr = location.value ? `${location.value}, ` : '';
    return t('meta.jobs.title', {
      displayTitle: displayTitle.value,
      locStr,
      country: country.value
    });
  },
  description: () => {
    const locStr = location.value || country.value;
    return t('meta.jobs.description', { displayTitle: displayTitle.value, locStr });
  },
  ogTitle: () => {
    const locStr = location.value ? `${location.value}, ` : '';
    return t('meta.jobs.ogTitle', { displayTitle: displayTitle.value, locStr });
  },
  ogDescription: () => {
    const locStr = location.value || country.value;
    return t('meta.jobs.ogDescription', { displayTitle: displayTitle.value, locStr });
  },
  ogImage: `${url.origin}/${$siteBrand}-og.png`,
  twitterCard: 'summary',
  robots: () =>
    !pending.value && !loading.value && !hasJobsData.value ? 'noindex' : 'index, follow'
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
            { '@type': 'ListItem', position: 1, name: t('navbar.home'), item: url.origin },
            {
              '@type': 'ListItem',
              position: 2,
              name: t('navbar.jobs'),
              item: `${url.origin}/jobs`
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: displayTitle.value,
              item: `${url.origin}/jobs/${route.params.title}/${route.params.country}`
            },
            ...(location.value
              ? [
                  {
                    '@type': 'ListItem',
                    position: 4,
                    name: location.value,
                    item: `${url.origin}${route.path}`
                  }
                ]
              : [])
          ]
        })
      )
    },
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: [...sortedExactListings.value, ...sortedSimilarListings.value].map(
            (listing, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: listing.redirect_url,
              name: listing.title
            })
          )
        })
      )
    }
  ]
});
</script>
