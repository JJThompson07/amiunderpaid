<template>
  <div class="text-center p-4 flex flex-col">
    <div class="flex flex-col items-center gap-2">
      <div class="flex flex-col sm:flex-row gap-3 items-center">
        <AmIChip :icon="verdict.icon" :bg-colour="verdict.bg" :text-colour="verdict.text">
          {{ verdict.label }}
        </AmIChip>
        <h2 class="text-3xl font-black text-slate-900">{{ verdict.title }}</h2>
      </div>
      <div>
        <p class="text-sm text-slate-600 mt-1">
          <template v-if="diffPercent === 0">
            Your salary is
            <span class="font-bold text-slate-900">exactly in line</span> with the market average.
          </template>
          <template v-else-if="isUnderpaid">
            {{ matchedTitle || displayTitle }} in {{ matchedLocation || location || country }} earn
            <span class="font-bold text-slate-900"
              >{{ currencySymbol }}{{ marketAverage.toLocaleString() }}</span
            >.
          </template>
          <template v-else>
            Your salary is
            <span class="font-bold text-slate-900">{{ diffPercent }}% higher</span> than the market
            average for your role.
          </template>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Check, TrendingDown, TrendingUp } from 'lucide-vue-next';

const props = defineProps<{
  displayTitle: string;
  location: string;
  country: string;
  marketAverage: number;
  currencySymbol: string;
  matchedTitle: string;
  matchedLocation: string;
  diffPercent: number;
  isUnderpaid: boolean;
}>();

const verdict = computed(() => {
  if (props.diffPercent === 0) {
    return {
      icon: Check,
      bg: 'bg-indigo-100',
      text: 'text-indigo-700',
      label: 'Fairly Paid',
      title: 'Spot on!'
    };
  }
  if (props.isUnderpaid) {
    return {
      icon: TrendingDown,
      bg: 'bg-negative-100',
      text: 'text-negative-700',
      label: 'Underpaid',
      title: `Underpaid by ${props.diffPercent}%`
    };
  }
  return {
    icon: TrendingUp,
    bg: 'bg-positive-100',
    text: 'text-positive-700',
    label: 'Above Market Average',
    title: "You're doing great!"
  };
});
</script>
