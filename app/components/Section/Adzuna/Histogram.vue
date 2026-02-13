<template>
  <div class="histogram">
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-lg font-bold text-slate-900">Salary Distribution</h3>
          <p class="text-xs text-slate-500">Based on live job listings</p>
        </div>
      </div>

      <!-- Chart -->
      <div class="histogram relative">
        <div class="flex items-end justify-between h-40 gap-2 mt-4 relative">
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
              class="absolute left-1/2 -translate-x-1/2 mb-2 z-10"
              :style="`bottom: ${(bucket.count / histogramMaxCount) * 100}%`">
              <div
                class="px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg whitespace-nowrap font-bold">
                {{ currencySymbol
                }}{{
                  Number(bucket.value).toLocaleString() + (index === buckets.length - 1 ? '+' : '')
                }}
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
      </div>

      <!-- X Axis Labels -->
      <div class="flex justify-between mt-2 gap-2 border-t border-slate-100 pt-2">
        <div
          v-for="(bucket, index) in buckets"
          :key="index"
          class="sm:flex-1 text-center text-2xs font-bold text-slate-400 uppercase tracking-wider"
          :class="index !== 0 && index !== buckets.length - 1 ? 'hidden sm:block' : ''">
          {{ currencySymbol
          }}{{ Number(bucket.value).toLocaleString() + (index === buckets.length - 1 ? '+' : '') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType } from 'vue';
import { getPercentage } from '~/helpers/utility';
import type { HistogramBucket } from '~/composables/useAdzuna';

defineProps({
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
</script>
