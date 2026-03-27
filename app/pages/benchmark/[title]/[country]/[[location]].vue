<template>
  <SalaryResultLayout
    :route="route"
    :pending="pending"
    :adzuna="adzuna"
    :market-data="marketData"
    :handle-ambiguity-select="handleAmbiguitySelect"
    :has-government-data="hasGovernmentData"
    :display-title="displayTitle"
    :location="location"
    :country="country"
    :currency-symbol="currencySymbol"
    :user-salary="userSalary"
    :search-title="searchTitle"
    :show-user-selection-prop="showUserSelection"
    :is-admin-verified="isAdminVerified"
    :adzuna-category="adzunaCategory"
    :job-listings="jobListings"
    :show-ambiguity-modal-prop="showAmbiguityModal"
    :job-type="jobType"
    :contract-type="contractType"
    :is-underpaid="isUnderpaid"
    :diff-percent="diffPercent"
    @update:show-user-selection="showUserSelection = $event"
    @update:show-ambiguity-modal="showAmbiguityModal = $event">
    <template #middle>
      <div class="flex flex-row gap-6">
        <SectionUKComparison
          v-show="country === 'UK' && marketData.regionalData.value && location"
          class="flex-4"
          :country="country"
          :location="location"
          :display-title="marketData.matchedTitle.value || displayTitle"
          :market-average="marketData.marketAverage.value"
          :user-salary="userSalary.value"
          :regional-data="marketData.regionalData.value"
          :year="marketData.marketDataYear.value" />
      </div>
    </template>

    <template #jobs-caption>
      <span class="text-slate-500 text-2xs uppercase">
        {{ $t('sections.jobs.caption') }}
      </span>
    </template>
  </SalaryResultLayout>
</template>

<script setup lang="ts">
import { useSalarySearch } from '~/composables/useSalarySearch';

const {
  route,
  adzuna,
  marketData,
  jobType,
  contractType,
  showAmbiguityModal,
  showUserSelection,
  displayTitle,
  country,
  location,
  userSalary,
  searchTitle,
  currencySymbol,
  adzunaCategory,
  hasGovernmentData,
  isUnderpaid,
  diffPercent,
  jobListings,
  isAdminVerified,
  pending,
  handleAmbiguitySelect
} = await useSalarySearch({ isBenchmark: true });
</script>