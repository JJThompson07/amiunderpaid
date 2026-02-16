<template>
  <CardResult
    class="government-comparison"
    :icon="Landmark"
    title="Government Benchmarks"
    :warning="
      isFallback &&
      Boolean(
        (matchedTitle && matchedTitle.toLowerCase() !== searchTitle.toLowerCase()) ||
        (matchedLocation && location && matchedLocation.toLowerCase() !== location.toLowerCase())
      )
    ">
    <template #info>
      <span v-if="!isFallback">
        Showing government matched data for
        {{
          matchedTitle && matchedTitle.toLowerCase() !== searchTitle.toLowerCase()
            ? 'market category'
            : ''
        }}
        <strong>{{ matchedTitle }}</strong>
      </span>
      <span v-else>
        Exact match not found. Showing {{ marketDataYear }} government data for
        <span class="font-bold">{{ matchedTitle }}</span>
        <span
          v-if="
            matchedLocation && location && matchedLocation.toLowerCase() !== location.toLowerCase()
          ">
          in <span class="font-bold">{{ matchedLocation }}</span></span
        >.
      </span>
    </template>

    <template #verdict>
      <div v-if="userSalary === 0" class="space-y-2 text-center">
        <h2 class="text-2xl font-black text-slate-900">
          Market Rate: {{ currencySymbol }}{{ marketAverage.toLocaleString() }}
        </h2>
      </div>

      <LazySectionSalaryVerdict
        v-else
        :display-title="displayTitle"
        :location="location"
        :country="country"
        :market-average="marketAverage"
        :currency-symbol="currencySymbol"
        :matched-title="matchedTitle"
        :matched-location="matchedLocation"
        :diff-percent="diffPercent"
        :is-underpaid="isUnderpaid" />
    </template>

    <template #footer>
      <LazySectionGovernmentSalaryVisualizer
        :user-salary="userSalary"
        :market-average="marketAverage"
        :market-low="marketLow"
        :market-high="marketHigh"
        :currency-symbol="currencySymbol"
        :diff-percent="diffPercent"
        :is-underpaid="isUnderpaid" />
    </template>
  </CardResult>
</template>

<script setup lang="ts">
import { Landmark } from 'lucide-vue-next';

defineProps<{
  isFallback: boolean;
  displayTitle: string;
  location: string;
  country: string;
  userSalary: number;
  marketAverage: number;
  currencySymbol: string;
  matchedTitle: string;
  matchedLocation: string;
  searchTitle: string;
  marketDataYear: number;
  diffPercent: number;
  isUnderpaid: boolean;
  marketLow: number;
  marketHigh: number;
}>();
</script>

<style scoped></style>
