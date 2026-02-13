<template>
  <div class="adzuna-comparison p-6 bg-white border shadow-xl rounded-2xl border-slate-200">
    <!-- Salary Verdict Section -->
    <div v-if="currentSalary === 0" class="space-y-2 flex flex-col items-center">
      <h2 class="text-2xl font-black text-slate-900 flex items-center">
        <DotIcon class="w-10 h-10 animate-pulse text-primary-500" />
        Live Market Rate: {{ currencySymbol }}{{ averageSalary.toLocaleString() }}
      </h2>
    </div>

    <SalaryVerdict
      v-else
      :display-title="displayTitle"
      :location="location"
      :country="country"
      :market-average="averageSalary"
      :currency-symbol="currencySymbol"
      matched-title=""
      :matched-location="location"
      :diff-percent="diffPercent"
      :is-underpaid="isUnderpaid" />

    <!-- Load Button State -->
    <div v-if="!hasData" class="flex flex-col items-center justify-center p-8">
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
import SalaryVerdict from '../SalaryVerdict.vue';
import { getDiffPercentage } from '~/helpers/utility';
import { DotIcon } from 'lucide-vue-next';

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
  },
  country: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  displayTitle: {
    type: String,
    required: true
  }
});

const hasData = computed(() => props.buckets && props.buckets.length > 0);

const diffPercent = computed(() => {
  if (props.averageSalary === 0) return 0;
  return getDiffPercentage(props.currentSalary, props.averageSalary);
});
</script>

<style scoped></style>
