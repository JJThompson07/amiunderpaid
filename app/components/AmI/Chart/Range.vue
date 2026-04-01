<template>
  <div class="w-full">
    <div class="flex justify-between items-end mb-2">
      <span class="text-sm font-bold text-slate-700 truncate mr-2">{{ label }}</span>
      <span class="text-sm font-bold text-slate-900 shrink-0">{{
        $t('mca.percentile', { percentile: formatOrdinal(Math.round(percentile)) })
      }}</span>
    </div>

    <div class="relative w-full h-2.5 bg-slate-300/50 rounded-full">
      <div
        class="absolute top-1/2 -translate-y-1/2 left-0 w-full h-5 pointer-events-none transition-all duration-1000 ease-out"
        :class="
          mca
            ? [
                'bg-[linear-gradient(to_right,var(--color-negative-400),var(--color-warning-300)_40%_60%,var(--color-neutral-400)_60%_80%,var(--color-positive-500))]'
              ]
            : ['bg-linear-to-r', from, via, to]
        "
        :style="{ clipPath: `circle(10px at ${clampedPercentile}% 50%)` }"></div>

      <div
        class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md pointer-events-none transition-all duration-1000 ease-out"
        :style="{ left: `${clampedPercentile}%` }"></div>
    </div>

    <p v-if="description" class="text-xs text-slate-500 font-medium mt-2 leading-tight">
      {{ description }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  percentile: { type: Number, required: true },
  label: { type: String, required: true },
  description: { type: String, default: '' },
  from: { type: String, default: 'from-negative-500' },
  via: { type: String, default: 'via-warning-500' },
  to: { type: String, default: 'to-positive-500' },
  mca: { type: Boolean, default: false }
});

// We use a reactive ref starting at 0 to trigger the slide-in animation
const animatedPercentile = ref(0);

onMounted(() => {
  // Wait a tiny fraction of a second, then set it to the target percentile.
  // Vue's transition-all class will automatically handle the smooth slide!
  setTimeout(() => {
    animatedPercentile.value = props.percentile;
  }, 50);
});

// Ensure the dot never mathematically overflows
const clampedPercentile = computed(() => {
  return Math.min(Math.max(animatedPercentile.value, 0), 100);
});
</script>
