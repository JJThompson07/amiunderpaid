<template>
  <div class="adzuna-comparison">
    <LazySectionAdzunaHistogram
      v-if="buckets && buckets.length"
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
  }
});
</script>

<style scoped></style>
