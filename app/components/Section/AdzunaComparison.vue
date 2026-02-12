<template>
  <div class="adzuna-comparison">
    <!-- Load Button State -->
    <div
      v-if="!hasData"
      class="flex flex-col items-center justify-center p-8 mt-6 bg-white border shadow-xl rounded-2xl border-slate-200">
      <h3 class="mb-2 text-lg font-bold text-slate-900">See Salary Distribution</h3>
      <p class="mb-6 text-sm text-center text-slate-500">
        View detailed salary breakdown based on live job listings.
      </p>
      <AmIButton :loading="loading" title="View Distribution" @click="$emit('fetch-data')">
        View Distribution
      </AmIButton>
    </div>

    <!-- Histogram -->
    <LazySectionAdzunaHistogram
      v-else
      :buckets="buckets"
      :histogram-range="histogramRange"
      :histogram-max-count="histogramMaxCount"
      :histogram-total-count="histogramTotalCount"
      :is-underpaid="isUnderpaid"
      :currency-symbol="currencySymbol"
      :average-salary="averageSalary"
      :current-salary="currentSalary" />
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { HistogramBucket } from '~/composables/useAdzuna';

defineEmits(['fetch-data']);

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
  averageSalary: {
    type: Number,
    default: 0
  },
  isUnderpaid: {
    type: Boolean,
    required: true
  },
  currentSalary: {
    type: Number,
    default: 0
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const hasData = computed(() => props.buckets && props.buckets.length > 0);
</script>

<style scoped></style>
