<template>
  <div
    class="government-comparison p-4 bg-white border shadow-xl rounded-2xl border-slate-200 flex flex-col gap-2 flex-1 justify-between items-center relative">
    <div class="flex items-center gap-2 justify-start w-full">
      <div class="p-1.5 bg-slate-100 rounded-lg text-slate-600">
        <LandmarkIcon class="w-4 h-4" aria-hidden="true" />
      </div>
      <h3 class="font-bold text-slate-900">Government Benchmarks</h3>
    </div>
    <div class="text-center flex flex-col gap-2">
      <span v-if="!isFallback" class="text-2xs flex justify-center items-center gap-1">
        <component :is="InfoIcon" class="h-3 w-3 text-neutral-700"></component>
        <span>
          Showing government matched data for
          {{
            matchedTitle && matchedTitle.toLowerCase() !== searchTitle.toLowerCase()
              ? 'market category'
              : ''
          }}
          <strong>{{ matchedTitle }}</strong>
        </span>
      </span>

      <!-- Fallback Notice -->
      <div
        v-else-if="
          (matchedTitle && matchedTitle.toLowerCase() !== searchTitle.toLowerCase()) ||
          (matchedLocation && location && matchedLocation.toLowerCase() !== location.toLowerCase())
        "
        class="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
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
import { InfoIcon, LandmarkIcon } from 'lucide-vue-next';

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
