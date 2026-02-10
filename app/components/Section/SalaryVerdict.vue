<template>
  <div class="p-6 text-center">
    <p class="mb-2 text-sm font-medium text-slate-500">
      Verdict for {{ displayTitle }} in {{ location || country }}
    </p>

    <!-- Fallback Notice -->
    <div
      v-if="
        (matchedTitle && matchedTitle.toLowerCase() !== searchTitle.toLowerCase()) ||
        (matchedLocation && location && matchedLocation.toLowerCase() !== location.toLowerCase())
      "
      class="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
      <Info class="w-3.5 h-3.5" />
      <span>
        Exact match not found. Showing {{ marketDataYear }} government data for
        <span class="font-bold">{{ matchedTitle }}</span>
        <span
          v-if="
            matchedLocation && location && matchedLocation.toLowerCase() !== location.toLowerCase()
          ">
          in <span class="font-bold">{{ matchedLocation }}</span></span
        >.
      </span>
    </div>

    <!-- No Salary Input -->
    <div v-if="userSalary === 0" class="space-y-2">
      <h1 class="text-3xl font-black text-slate-900">
        Market Rate: {{ currencySymbol }}{{ marketAverage.toLocaleString() }}
      </h1>
      <p class="text-sm text-slate-500">
        You didn't enter a current salary, so we're comparing against the standard market average.
      </p>
    </div>

    <!-- Spot On / Fairly Paid -->
    <div v-else-if="diffPercent === 0" class="flex flex-col items-center space-y-3">
      <AmIChip :icon="Check" bg-colour="bg-indigo-100" text-colour="text-indigo-700">
        Fairly Paid
      </AmIChip>
      <div>
        <h2 class="text-4xl font-black text-slate-900">Spot on!</h2>
        <p class="text-sm text-slate-600 mt-1">
          Your salary is
          <span class="font-bold text-slate-900">exactly in line</span> with the market average.
        </p>
      </div>
    </div>

    <!-- Underpaid -->
    <div v-else-if="isUnderpaid" class="flex flex-col items-center space-y-3">
      <AmIChip :icon="TrendingDown" bg-colour="bg-negative-100" text-colour="text-negative-700">
        Underpaid
      </AmIChip>
      <div>
        <h2 class="text-4xl font-black text-slate-900">Underpaid by {{ diffPercent }}%</h2>
        <p class="text-sm text-slate-600 mt-1">
          Typical {{ matchedTitle || displayTitle }}s in
          {{ matchedLocation || location || country }} earn
          <span class="font-bold text-slate-900"
            >{{ currencySymbol }}{{ marketAverage.toLocaleString() }}</span
          >.
        </p>
      </div>
    </div>

    <!-- Above Average -->
    <div v-else class="flex flex-col items-center space-y-3">
      <AmIChip :icon="TrendingUp" bg-colour="bg-positive-100" text-colour="text-positive-700">
        Above Market Average
      </AmIChip>
      <div>
        <h2 class="text-4xl font-black text-slate-900">You're doing great!</h2>
        <p class="text-sm text-slate-600 mt-1">
          Your salary is
          <span class="font-bold text-slate-900">{{ diffPercent }}% higher</span> than the market
          average for your role.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Info, Check, TrendingDown, TrendingUp } from 'lucide-vue-next';

defineProps<{
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
}>();
</script>
