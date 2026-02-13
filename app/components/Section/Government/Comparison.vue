<template>
  <div
    class="government-comparison bg-white border shadow-xl rounded-2xl border-slate-200 flex flex-col gap-4 flex-1 flex flex-col justify-between">
    <div class="text-center flex flex-col gap-2 p-6">
      <!-- Fallback Notice -->
      <div
        v-if="
          isFallback &&
          ((matchedTitle && matchedTitle.toLowerCase() !== searchTitle.toLowerCase()) ||
            (matchedLocation &&
              location &&
              matchedLocation.toLowerCase() !== location.toLowerCase()))
        "
        class="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
        <p class="mb-2 text-sm font-medium text-slate-500">
          Verdict for {{ displayTitle }} in {{ location || country }}
        </p>
        <InfoIcon class="w-3.5 h-3.5" />
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
      <div v-if="userSalary === 0" class="space-y-2 flex flex-col items-center">
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

      <div v-if="!isFallback">
        <span class="mb-2 text-sm font-medium text-slate-500"
          >Showing government matched data for
          {{
            matchedTitle && matchedTitle.toLowerCase() !== searchTitle.toLowerCase() ? 'group' : ''
          }}
          <strong>{{ matchedTitle }}</strong></span
        >
      </div>
    </div>

    <!-- Comparison Visualizer -->
    <LazySectionGovernmentSalaryVisualizer
      :user-salary="userSalary"
      :market-average="marketAverage"
      :market-low="marketLow"
      :market-high="marketHigh"
      :currency-symbol="currencySymbol"
      :diff-percent="diffPercent"
      :is-underpaid="isUnderpaid" />
  </div>
</template>

<script setup lang="ts">
import { InfoIcon } from 'lucide-vue-next';

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
