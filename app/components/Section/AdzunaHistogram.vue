<template>
  <div class="overflow-hidden bg-white border shadow-xl rounded-2xl border-slate-200 mt-6">
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-lg font-bold text-slate-900">Salary Distribution</h3>
          <p class="text-xs text-slate-500">Based on live job listings</p>
        </div>
        <div class="px-2 py-1 text-xs font-bold text-white rounded bg-secondary-500">
          Adzuna Data
        </div>
      </div>

      <!-- Chart -->
      <div class="histogram relative py-2">
        <div class="flex items-end justify-between h-40 gap-2 mt-4">
          <div
            v-for="(bucket, index) in buckets"
            :key="index"
            class="relative flex-1 group flex flex-col justify-end h-full"
            @mouseenter="activeIndex = index"
            @mouseleave="activeIndex = -1">
            <!-- Bar -->
            <div
              class="w-full bg-primary-500 rounded-t-sm transition-all duration-300 group-hover:bg-primary-400 relative"
              :style="{ height: `${(bucket.count / histogramMaxCount) * 100}%` }" />

            <!-- Tooltip -->
            <div
              v-if="activeIndex === index"
              class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10">
              <div
                class="px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg whitespace-nowrap font-bold">
                {{ currencySymbol }}{{ Number(bucket.value).toLocaleString() }}
                <span class="font-normal opacity-80"
                  >({{ getPercentage(bucket.count, histogramTotalCount, true) }}%)</span
                >
              </div>
              <!-- Arrow -->
              <div
                class="w-2 h-2 bg-slate-800 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
            </div>
          </div>
        </div>
        <!-- Average Line -->
        <div
          class="average absolute top-0 bottom-0 -translate-x-1/2 rounded flex flex-col justify-center items-center"
          :style="`left: ${averagePercent}%`">
          <span class="average-line bg-secondary-500/50 w-1 h-full" />
          <span
            class="average-label px-2 py-1 text-2xs text-center font-bold text-secondary-500 bg-secondary-50 rounded absolute top-full -translate-x-1/2 flex flex-col shadow-md"
            :style="`left: ${averagePercent}%`">
            <span>Avg</span>
            <span>{{ currencySymbol }}{{ averageSalary.toLocaleString() }} </span></span
          >
        </div>
        <!-- Current Salary Line -->
        <div
          v-if="currentSalary"
          class="current absolute top-0 bottom-0 -translate-x-1/2 rounded flex flex-col justify-center items-center"
          :class="isUnderpaid ? 'text-negative-600' : 'text-positive-600'"
          :style="`left: ${currentSalaryPercent}%`">
          <span
            class="average-line w-1 h-full"
            :class="isUnderpaid ? 'bg-negative-500/50' : 'bg-positive-500/50'" />
          <span
            class="average-label px-2 py-1 text-2xs text-center font-bold rounded absolute top-full -translate-x-1/2 flex flex-col shadow-md"
            :class="isUnderpaid ? 'bg-negative-100' : 'bg-positive-100'"
            :style="`left: ${currentSalaryPercent}%`">
            <span>You</span>
            <span>{{ currencySymbol }}{{ currentSalary.toLocaleString() }} </span></span
          >
        </div>
      </div>

      <!-- X Axis Labels -->
      <div
        class="flex justify-between mt-2 text-2xs font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 pt-2">
        <span>{{ currencySymbol }}{{ Number(buckets[0]?.value || 0).toLocaleString() }}</span>
        <span
          >{{ currencySymbol
          }}{{ Number(buckets[buckets.length - 1]?.value || 0).toLocaleString() }}+</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type PropType } from 'vue';
import { getPercentage } from '~/helpers/utility';
import type { HistogramBucket } from '~/composables/useAdzuna';

const props = defineProps({
  buckets: {
    type: Array as PropType<HistogramBucket[]>,
    required: true
  },
  histogramRange: {
    type: Number,
    required: true
  },
  histogramMaxCount: {
    type: Number,
    required: true
  },
  histogramTotalCount: {
    type: Number,
    required: true
  },
  currencySymbol: {
    type: String,
    required: true
  },
  isUnderpaid: {
    type: Boolean,
    required: true
  },
  currentSalary: {
    type: Number,
    default: 0
  },
  averageSalary: {
    type: Number,
    default: 0
  }
});

const activeIndex = ref(-1);

const averagePercent = computed(() => {
  if (props.averageSalary === 0) return 0;

  const min = props.buckets[0]?.value || 0;
  const avg = props.averageSalary - min;
  const percent = getPercentage(avg, props.histogramRange);
  return Math.max(0, Math.min(100, percent));
});

const currentSalaryPercent = computed<number>(() => {
  const min = props.buckets[0]?.value || 0;
  const percent = getPercentage(props.currentSalary - min, props.histogramRange);

  return Math.max(0, Math.min(100, percent));
});
</script>
