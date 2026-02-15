<template>
  <div
    class="adzuna-comparison p-4 bg-white border shadow-xl rounded-2xl border-slate-200 relative overflow-hidden flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <div class="p-1.5 bg-secondary-100 rounded-lg text-secondary-600">
        <TrendingUp class="w-4 h-4" aria-hidden="true" />
      </div>
      <h3 class="font-bold text-slate-900">Live {{ country }} Market Analysis</h3>
    </div>

    <span class="text-2xs flex justify-center items-center gap-1">
      <component :is="InfoIcon" class="h-3 w-3 text-neutral-700"></component>
      Showing government matched data for
      <strong>{{ jobsCount }}</strong> live jobs.
    </span>

    <!-- Salary Verdict Section -->
    <div v-if="currentSalary === 0" class="space-y-2 flex flex-col items-center flex-1">
      <h2 class="text-2xl font-black text-slate-900 flex flex-col gap-1 items-center">
        <div class="flex items-center gap-2">
          <DotIcon class="w-10 h-10 animate-pulse text-primary-500" />
          <span> Live Market Rate</span>
        </div>
        <span> {{ currencySymbol }}{{ averageSalary.toLocaleString() }} </span>
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
    <div v-if="!hasData || !showHistogram" class="flex items-center justify-center w-full">
      <AmIButton :loading="loading" title="View Distribution" @click="toggleHistogram">
        View Salary Distribution
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
      :current-salary="currentSalary"
      @close="showHistogram = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { HistogramBucket } from '~/composables/useAdzuna';
import SalaryVerdict from '../SalaryVerdict.vue';
import { getDiffPercentage } from '~/helpers/utility';
import { DotIcon, InfoIcon, TrendingUp } from 'lucide-vue-next';

const emit = defineEmits(['fetch-data']);

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
  jobsCount: {
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

const showHistogram = ref<boolean>(false);

const hasData = computed<boolean>(() => props.buckets && props.buckets.length > 0);

const diffPercent = computed(() => {
  if (props.averageSalary === 0) return 0;
  return getDiffPercentage(props.currentSalary, props.averageSalary);
});

const toggleHistogram = () => {
  showHistogram.value = !showHistogram.value;
  if (!hasData.value) {
    emit('fetch-data');
  }
};
</script>

<style scoped></style>
