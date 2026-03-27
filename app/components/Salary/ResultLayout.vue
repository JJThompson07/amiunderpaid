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
      v-if="!pending && !adzuna.loading.value && !hasGovernmentData && !adzuna.hasJobsData.value"
      :title="displayTitle"
      :location="location"
      :country="country"
      @select="handleAmbiguitySelect" />

    <div
      v-show="!pending && (hasGovernmentData || adzuna.hasJobsData.value)"
      class="relative grid grid-cols-1 px-4 gap-6">
      <div class="relative mx-auto flex flex-col gap-6 w-full">
        <div class="flex flex-col gap-6 md:flex-row">
          <div v-if="adzuna.hasJobsData.value" class="flex flex-col flex-1 min-w-0 gap-3 adzuna-section">
            <LazySectionAdzunaComparison
              class="flex-1"
              :buckets="adzuna.histogramBuckets.value"
              :histogram-range="adzuna.histogramRange.value"
              :histogram-max-count="adzuna.histogramMaxCount.value"
              :histogram-total-count="adzuna.histogramTotalCount.value"
              :is-underpaid="adzuna.isUnderpaid(userSalary)"
              :currency-symbol="currencySymbol"
              :average-salary="adzuna.meanSalary.value"
              :current-salary="userSalary"
              :loading="adzuna.loading.value"
              :country="country"
              :location="location"
              :display-title="displayTitle"
              :jobs-count="adzuna.jobsCount.value"
              @fetch-data="adzuna.fetchHistogram(searchTitle, location, country)" />
          </div>

          <div
            v-if="hasGovernmentData && !localShowUserSelection"
            class="flex flex-col flex-1 min-w-0 gap-3 government-section relative">
            <LazySectionGovernmentComparison
              class="overflow-hidden flex-1"
              :is-fallback="!adzuna.hasJobsData.value"
              :display-title="displayTitle"
              :location="location"
              :country="country"
              :user-salary="userSalary"
              :market-average="marketData.marketAverage.value"
              :currency-symbol="currencySymbol"
              :matched-title="marketData.matchedTitle.value"
              :matched-location="marketData.matchedLocation.value"
              :search-title="searchTitle"
              :market-data-year="marketData.marketDataYear.value"
              :diff-percent="diffPercent"
              :is-underpaid="isUnderpaid"
              :market-low="marketData.marketLow.value"
              :market-high="marketData.marketHigh.value"
              :is-verified="isAdminVerified"
              @user-select="localShowUserSelection = true" />
          </div>

          <div
            v-if="(adzuna.hasJobsData.value && !hasGovernmentData && !marketData.loading.value && !pending) || localShowUserSelection"
            class="flex flex-col flex-1 min-w-0 gap-3 relative">
            <LazySectionGovernmentUserSelection
              class="flex-1 w-full"
              :adzuna-category="adzunaCategory"
              :country="country"
              @select="handleAmbiguitySelect" />
          </div>
        </div>

        <slot name="middle" />

        <div v-if="jobListings.length" class="flex flex-col gap-2">
          <h3 class="relative text-xl md:text-2xl text-slate-900 font-bold sm:whitespace-nowrap">
            <a
              :href="$t(`sections.jobs.href.${country.toLowerCase()}`)"
              class="text-primary-500 hover:text-primary-700 transition-colors duration-500 ease-in-out"
              >{{ $t('sections.jobs.jobs') }}</a
            >
            {{ $t('sections.jobs.by-adzuna') }}
          </h3>

          <slot name="jobs-caption" />

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
                :market-average="marketData.marketAverage.value"
                :currency-symbol="currencySymbol"
                :url="listing.redirect_url" />
            </div>
          </AmICarousel>
        </div>

        <slot name="bottom" />

        <p class="flex items-center justify-center gap-1 mt-6 text-2xs text-center text-slate-400">
          <Info class="w-3 h-3" />
          {{ $t('common.data.disclaimer') }}
        </p>
      </div>
    </div>

    <LazyModalAmbiguity
      v-if="localShowAmbiguityModal"
      :title="displayTitle"
      :matches="marketData.ambiguousMatches.value"
      @select="handleAmbiguitySelect"
      @close="localShowAmbiguityModal = false" />

    <ClientOnly>
      <AmILoader v-if="pending || adzuna.loading.value" :message="$t('common.searching')" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { Info } from 'lucide-vue-next';
import { computed } from 'vue';

const props = defineProps<{
  route: any;
  pending: boolean;
  adzuna: any;
  marketData: any;
  handleAmbiguitySelect: (match: any) => Promise<void>;
  hasGovernmentData: boolean;
  displayTitle: string;
  location: string;
  country: string;
  currencySymbol: string;
  userSalary: number;
  searchTitle: string;
  isAdminVerified: boolean;
  adzunaCategory: string;
  jobListings: any[];
  showAmbiguityModalProp: boolean;
  showUserSelectionProp: boolean;
  jobType: string;
  contractType: string;
  isUnderpaid: boolean;
  diffPercent: number;
}>();

const emit = defineEmits<{
  (e: 'update:showUserSelection' | 'update:showAmbiguityModal', value: boolean): void;
}>();

const localShowUserSelection = computed({
  get: () => props.showUserSelectionProp,
  set: (val) => emit('update:showUserSelection', val)
});

const localShowAmbiguityModal = computed({
  get: () => props.showAmbiguityModalProp,
  set: (val) => emit('update:showAmbiguityModal', val)
});

</script>