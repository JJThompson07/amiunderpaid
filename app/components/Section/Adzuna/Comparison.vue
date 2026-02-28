<template>
  <CardResult
    class="adzuna-comparison"
    :icon="TrendingUp"
    icon-bg="bg-secondary-100"
    icon-colour="bg-secondary-600"
    :title="$t('sections.adzuna.title', { country })"
    :user-salary="currentSalary"
    :market-average="averageSalary"
    :currency-symbol="currencySymbol"
    :comparison="comparison">
    <template #info>
      <h4 class="font-bold text-xl lg:text-2xl md:line-clamp-1" :title="displayTitle">
        {{ displayTitle }}
      </h4>
      <i18n-t keypath="sections.adzuna.results" tag="span" class="leading-relaxed">
        <template #jobsCount>
          <span class="font-bold">{{ jobsCount }}</span>
        </template>
      </i18n-t>
    </template>
    <template #verdict>
      <SectionSalaryVerdict
        v-if="currentSalary > 0"
        :market-average="averageSalary"
        :currency-symbol="currencySymbol"
        :diff="Math.abs(currentSalary - averageSalary)"
        :diff-percent="diffPercent"
        :comparison="comparison"
        :is-underpaid="isUnderpaid" />
    </template>
    <template #footer>
      <!-- Load Button State -->
      <div v-if="!hasData || !showHistogram" class="flex items-center justify-center w-full">
        <AmIButton
          :loading="loading"
          :title="$t('sections.adzuna.view-salary-distribution')"
          @click="toggleHistogram">
          {{ $t('sections.adzuna.view-salary-distribution') }}
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
import { getRawDiffPercentage } from '~/helpers/utility';
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
  return getRawDiffPercentage(props.currentSalary, props.averageSalary);
});

const comparison = computed<number>(() => {
  if (diffPercent.value > 2.5) {
    return 1;
  } else if (diffPercent.value < -2.5) {
    return -1;
  } else {
    return 0;
  }
});

const toggleHistogram = () => {
  showHistogram.value = !showHistogram.value;
  if (!hasData.value) {
    emit('fetch-data');
  }
};
</script>

<style scoped></style>
