<template>
  <div class="w-full">
    <div class="flex justify-between items-end mb-2">
      <span class="text-sm font-bold text-slate-700 truncate mr-2">{{ label }}</span>
      <span aria-hidden="true" class="text-xs sm:text-sm font-bold text-slate-900 shrink-0">
        {{ $t('mca.percentile', { percentile: formatOrdinal(Math.round(percentile)) }) }}
      </span>
    </div>

    <div
      class="relative w-full h-2.5 bg-slate-300/50 rounded-full"
      role="meter"
      :aria-label="label"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(percentile)">
      <div
        class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md pointer-events-none transition-all duration-1000 ease-out"
        :class="circleClass"
        :style="circleStyle"></div>
    </div>

    <p v-if="description" class="text-2xs sm:text-xs text-slate-500 font-medium mt-2 leading-tight">
      {{ description }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type PropType } from 'vue';

export type AmIChartRangeBreakdown = {
  colour: string; // e.g., 'bg-blue-500' (Tailwind class) OR '#3b82f6' (Hex code)
  value: number;
};

const props = defineProps({
  percentile: { type: Number, required: true },
  label: { type: String, required: true },
  description: { type: String, default: '' },
  breakdown: { type: Array as PropType<AmIChartRangeBreakdown[]>, default: () => [] },
  mca: { type: Boolean, default: false }
});

const animatedPercentile = ref(0);

onMounted(() => {
  setTimeout(() => {
    animatedPercentile.value = props.percentile;
  }, 50);
});

const clampedPercentile = computed(() => {
  return Math.min(Math.max(animatedPercentile.value, 0), 100);
});

// 1. Handles pre-defined Tailwind CSS classes
const circleClass = computed<string>(() => {
  if (props.mca) {
    if (props.percentile >= 80) return 'bg-positive-500';
    if (props.percentile >= 60) return 'bg-neutral-500';
    if (props.percentile >= 40) return 'bg-warning-500';
    return 'bg-negative-500';
  }

  if (props.breakdown.length > 0) {
    const match = getBreakdownMatch();
    // If the color provided is a tailwind class (starts with 'bg-'), return it here
    if (match && match.colour.startsWith('bg-')) return match.colour;
  }

  // Default fallback if no valid conditions are met
  return 'bg-slate-500';
});

// 2. Handles positioning and dynamic Hex codes
const circleStyle = computed(() => {
  const styles: Record<string, string> = {
    left: `${clampedPercentile.value}%`
  };

  if (!props.mca && props.breakdown.length > 0) {
    const match = getBreakdownMatch();
    // If the color provided is a Hex code (starts with '#'), bind it to inline style
    if (match && match.colour.startsWith('#')) {
      styles.backgroundColor = match.colour;
    }
  }

  return styles;
});

// Helper function: cleaner logic using sort() and find()
const getBreakdownMatch = () => {
  // Sort descending so we can just find the first threshold we are greater than
  const sortedBreakdowns = [...props.breakdown].sort((a, b) => b.value - a.value);
  return sortedBreakdowns.find((b) => props.percentile >= b.value);
};
</script>
