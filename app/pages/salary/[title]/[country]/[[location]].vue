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
    </template>

    <template #bottom>
      <LazySectionNegotiation
        v-show="hasGovernmentData || adzuna.hasJobsData.value"
        class="lg:col-span-4"
        :title="displayTitle"
        :current-salary="userSalary.value"
        :market-average="adzuna.meanSalary.value || marketData.marketAverage.value"
        :currency-symbol="currencySymbol"
        :country="country" />
    </template>
  </SalaryResultLayout>
</template>

<script setup lang="ts">
import { FileUser } from 'lucide-vue-next';
import { useSalarySearch } from '~/composables/useSalarySearch';

const {
  route,
  isXl,
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
} = await useSalarySearch({ isBenchmark: false });
</script>
