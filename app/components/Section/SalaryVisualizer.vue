<template>
  <div class="px-6 py-5 border-t bg-slate-50 border-slate-200">
    <div class="relative pt-8 pb-2">
      <!-- Range Bar -->
      <div class="relative h-3 rounded-full bg-slate-200">
        <!-- High/Low Markers -->
        <div class="absolute left-0 -top-6 text-2xs font-bold text-slate-400 uppercase">Low</div>
        <div class="absolute right-0 -top-6 text-2xs font-bold text-slate-400 uppercase">High</div>

        <!-- Market Average Dot -->
        <div
          class="absolute z-10 w-5 h-5 -translate-x-1/2 -translate-y-1/2 bg-primary-600 border-[3px] border-white rounded-full shadow-md top-1/2 left-1/2">
          <div
            class="absolute -translate-x-1/2 -top-6 left-1/2 text-[9px] font-black text-primary-600 whitespace-nowrap">
            AVG
          </div>
        </div>

        <!-- User Salary Marker -->
        <div
          v-if="userSalary > 0 && marketHigh > 0"
          class="absolute z-20 w-1 h-8 transition-all duration-1000 -translate-y-1/2 top-1/2"
          :class="
            diffPercent === 0 ? 'bg-slate-600' : isUnderpaid ? 'bg-negative-700' : 'bg-positive-700'
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
            YOU
          </div>
        </div>
      </div>
    </div>

    <!-- Key Stats Row -->
    <div class="flex justify-between mt-6 text-xs">
      <div class="text-center">
        <span class="font-bold text-slate-500"
          >{{ currencySymbol }}{{ marketLow.toLocaleString() }}</span
        >
      </div>
      <div class="text-center">
        <span class="font-bold text-primary-600"
          >{{ currencySymbol }}{{ marketAverage.toLocaleString() }}</span
        >
      </div>
      <div class="text-center">
        <span class="font-bold text-slate-500"
          >{{ currencySymbol }}{{ marketHigh.toLocaleString() }}</span
        >
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
