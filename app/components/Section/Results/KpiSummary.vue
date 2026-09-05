<template>
  <div class="kpi-summary grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full">
    <div
      v-if="userSalary"
      class="flex flex-col gap-2 p-4 md:p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div class="flex items-center gap-2">
        <div class="p-1.5 bg-slate-100 rounded-lg text-slate-600">
          <Wallet class="w-4 h-4" aria-hidden="true" />
        </div>
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wide">{{
          $t('card.result.your-salary')
        }}</span>
      </div>
      <span class="font-black text-2xl lg:text-3xl text-slate-900"
        >{{ currencySymbol }}{{ userSalary.toLocaleString() }}</span
      >
    </div>

    <div
      v-if="hasJobsData"
      class="flex flex-col gap-2 p-4 md:p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div class="flex items-center gap-2">
        <div class="p-1.5 bg-secondary-100 rounded-lg text-secondary-600">
          <TrendingUp class="w-4 h-4" aria-hidden="true" />
        </div>
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wide">{{
          $t('sections.kpi.live-market')
        }}</span>
      </div>
      <span class="font-black text-2xl lg:text-3xl text-slate-900"
        >{{ currencySymbol }}{{ liveMarketAverage.toLocaleString() }}</span
      >
      <span
        v-if="userSalary && liveMarketAverage"
        class="text-xs font-bold"
        :class="liveVarianceColour">
        {{ liveDiffPercent < 0 ? '-' : '+' }}{{ currencySymbol }}{{ liveDiff.toLocaleString() }} ({{
          liveDiffPercent
        }}%)
      </span>
    </div>

    <div
      v-if="hasGovernmentData"
      class="flex flex-col gap-2 p-4 md:p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div class="flex items-center gap-2">
        <div class="p-1.5 bg-neutral-100 rounded-lg text-neutral-600">
          <Landmark class="w-4 h-4" aria-hidden="true" />
        </div>
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wide">{{
          $t('sections.government.title')
        }}</span>
      </div>
      <span class="font-black text-2xl lg:text-3xl text-slate-900"
        >{{ currencySymbol }}{{ govMarketAverage.toLocaleString() }}</span
      >
      <span
        v-if="userSalary && govMarketAverage"
        class="text-xs font-bold"
        :class="govVarianceColour">
        {{ diffPercentGov < 0 ? '-' : '+' }}{{ currencySymbol }}{{ govDiff.toLocaleString() }} ({{
          diffPercentGov
        }}%)
      </span>
    </div>

    <div
      v-if="hasGovernmentData"
      class="flex flex-col gap-2 p-4 md:p-5 bg-linear-to-br from-primary-600 to-secondary-700 border border-primary-700 rounded-2xl shadow-md text-white">
      <div class="flex items-center gap-2">
        <div class="p-1.5 bg-white/15 rounded-lg text-white">
          <Rocket class="w-4 h-4" aria-hidden="true" />
        </div>
        <span class="text-xs font-bold text-white/80 uppercase tracking-wide">{{
          $t('sections.kpi.ceiling-label', { percentile: ceilingOrdinal })
        }}</span>
      </div>
      <span class="font-black text-2xl lg:text-3xl"
        >{{ currencySymbol }}{{ marketHigh.toLocaleString() }}</span
      >
      <span class="text-xs font-bold text-white/85">{{
        $t('sections.kpi.ceiling-description')
      }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Landmark, Rocket, TrendingUp, Wallet } from 'lucide-vue-next';
import { getRawDiffPercentage } from '~/helpers/utility';
import { formatOrdinal } from '~~/shared/utils/formatter';

const props = defineProps({
  userSalary: {
    type: Number,
    default: 0
  },
  currencySymbol: {
    type: String,
    required: true
  },
  hasJobsData: {
    type: Boolean,
    default: false
  },
  liveMarketAverage: {
    type: Number,
    default: 0
  },
  hasGovernmentData: {
    type: Boolean,
    default: false
  },
  govMarketAverage: {
    type: Number,
    default: 0
  },
  marketHigh: {
    type: Number,
    default: 0
  },
  diffPercentGov: {
    type: Number,
    default: 0
  }
});

const ceilingOrdinal = computed<string>(() => formatOrdinal(75));

const liveDiffPercent = computed<number>(() => {
  if (!props.userSalary || !props.liveMarketAverage) {
    return 0;
  }
  return getRawDiffPercentage(props.userSalary, props.liveMarketAverage);
});

const liveDiff = computed<number>(() => Math.abs(props.userSalary - props.liveMarketAverage));

const varianceColour = (diffPercent: number): string => {
  if (diffPercent < -2.5) {
    return 'text-negative-600';
  }
  if (diffPercent > 2.5) {
    return 'text-positive-600';
  }
  return 'text-slate-500';
};

const liveVarianceColour = computed<string>(() => varianceColour(liveDiffPercent.value));

const govDiff = computed<number>(() => Math.abs(props.userSalary - props.govMarketAverage));

const govVarianceColour = computed<string>(() => varianceColour(props.diffPercentGov));
</script>

<style scoped></style>
