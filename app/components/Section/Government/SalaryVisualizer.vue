<template>
  <div class="w-full relative p-4">
    <div class="relative pt-8 pb-2">
      <!-- Range Bar -->
      <div class="relative h-3 rounded-full bg-slate-300/50">
        <!-- High/Low Markers -->
        <div class="absolute left-0 -top-6 text-2xs uppercase font-bold text-slate-500">
          {{ $t('sections.visualiser.low') }} {{ currencySymbol }}{{ marketLow.toLocaleString() }}
        </div>
        <div class="absolute right-0 -top-6 text-2xs uppercase font-bold text-slate-500">
          {{ $t('sections.visualiser.high') }} {{ currencySymbol }}{{ marketHigh.toLocaleString() }}
        </div>

        <!-- Market Average Dot -->
        <div
          class="absolute z-10 w-1 h-full -translate-x-1/2 -translate-y-1/2 bg-primary-600 shadow-md top-1/2 left-1/2"
          :style="{ left: `${averagePosition}%` }">
          <div
            class="absolute -translate-x-1/2 -top-6 left-1/2 text-2xs font-black text-primary-600 whitespace-nowrap">
            {{ $t('sections.visualiser.average') }} {{ currencySymbol
            }}{{ marketAverage.toLocaleString() }}
          </div>
        </div>

        <!-- User Salary Marker -->
        <div
          v-if="userSalary > 0 && marketHigh > 0"
          class="absolute z-20 w-5 h-5 transition-all duration-1000 -translate-1/2 top-1/2 rounded-full border-2 border-white animate-user-marker-enter"
          :class="
            diffPercent === 0
              ? 'bg-slate-600/75'
              : isUnderpaid
                ? 'bg-negative-700/75'
                : 'bg-positive-700/75'
          "
          :style="{ left: `${salaryPosition}%` }">
          <div
            class="absolute -bottom-6 left-1/2 -translate-x-1/2 text-2xs font-black whitespace-nowrap"
            :class="
              diffPercent === 0
                ? 'text-slate-600'
                : isUnderpaid
                  ? 'text-negative-700'
                  : 'text-positive-700'
            ">
            {{ currencySymbol }}{{ userSalary.toLocaleString() }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  userSalary: number;
  marketAverage: number;
  marketLow: number;
  marketHigh: number;
  currencySymbol: string;
  diffPercent: number;
  isUnderpaid: boolean;
}>();

// Safe percentage for the progress bar relative to the Low-High range
const averagePosition = computed(() => {
  if (props.marketHigh <= props.marketLow) return 50; // Avoid division by zero
  const range = props.marketHigh - props.marketLow;
  const offset = props.marketAverage - props.marketLow;
  return Math.min(Math.max((offset / range) * 100, 0), 100);
});

const salaryPosition = computed<number>(() => {
  const high = props.marketHigh;
  const low = props.marketLow;
  const range = high - low;
  if (range <= 0) return 50;

  const offset = props.userSalary - low;
  const pct = (offset / range) * 100;

  return Math.min(Math.max(pct, 0), 100);
});
</script>

<style scoped>
.animate-user-marker-enter {
  animation: userMarkerEnter 0.7s ease-out forwards;
}

@keyframes userMarkerEnter {
  0% {
    left: 0;
  }
}
</style>
