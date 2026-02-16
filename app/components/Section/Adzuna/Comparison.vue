<template>
  <CardResult
    class="adzuna-comparison"
    :icon="TrendingUp"
    icon-bg="bg-secondary-100"
    icon-colour="bg-secondary-600"
    :title="`Live ${country} Market Analysis`">
    <template #info>
      <span>
        Showing government matched data for
        <strong>{{ jobsCount }}</strong> live jobs.
      </span>
    </template>
    <template #verdict>
      <div v-if="currentSalary === 0" class="space-y-2 text-center">
        <h2 class="text-2xl font-black text-slate-900">
          Live Market Rate: {{ currencySymbol }}{{ Math.round(averageSalary).toLocaleString() }}
        </h2>
      </div>

      <SectionSalaryVerdict
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
    </template>
    <template #footer>
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
    </template>
  </CardResult>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { HistogramBucket } from '~/composables/useAdzuna';
import { getDiffPercentage } from '~/helpers/utility';
import { TrendingUp } from 'lucide-vue-next';

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
