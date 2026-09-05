<template>
  <div
    class="ami-role relative rounded-2xl flex flex-col flex-1 bg-white border border-slate-200 shadow-md overflow-hidden">
    <header class="flex gap-3 py-3 px-4 items-start justify-between">
      <div class="flex gap-3 items-center min-w-0">
        <div
          class="shrink-0 w-10 h-10 rounded-full bg-secondary-100 text-secondary-700 flex items-center justify-center font-bold text-sm uppercase">
          {{ companyInitial }}
        </div>
        <div class="ami-role-describe min-w-0">
          <h3 class="font-semibold line-clamp-1">{{ title }}</h3>
          <div class="flex flex-row gap-2 items-center text-slate-500 min-w-0">
            <span class="text-2xs line-clamp-1">{{ company }}</span>
            <span class="text-2xs flex gap-1 items-center line-clamp-1 shrink-0"
              ><MapPinIcon class="w-3 h-3" />{{ location }}</span
            >
          </div>
        </div>
      </div>
      <AmIChip
        v-if="userSalary && isSalaryProvided"
        v-bind="comparisonChipAttributes"
        class="shrink-0"
        >{{ salaryMaxComparison }}%</AmIChip
      >
    </header>
    <section class="ami-role-range flex flex-col gap-2 py-2 px-4">
      <div class="flex flex-col gap-1 bg-slate-50 rounded-xl p-3">
        <span class="uppercase text-2xs text-slate-400 font-bold tracking-wide">{{
          $t('card.role.salary')
        }}</span>
        <span
          :class="
            isSalaryProvided
              ? 'text-2xl font-black text-slate-900'
              : 'text-slate-400 text-xs italic'
          "
          >{{ salaryRange }}</span
        >
        <span
          v-if="userSalary && isSalaryProvided"
          class="text-2xs font-bold"
          :class="
            salaryMaxComparison === 0
              ? 'text-slate-400'
              : salaryMaxComparison < 0
                ? 'text-negative-700'
                : 'text-positive-700'
          "
          >{{
            salaryMaxComparison === 0
              ? $t(`card.role.${$siteBrand}.compare.no-change`)
              : salaryMaxComparison < 0
                ? $t(`card.role.${$siteBrand}.compare.pay-cut`)
                : $t(`card.role.${$siteBrand}.compare.pay-rise`)
          }}</span
        >
      </div>
      <div class="flex flex-row flex-wrap gap-1">
        <AmIChip
          bg-colour="bg-slate-100"
          text-colour="text-slate-600"
          text-size="text-2xs"
          font="font-base"
          compact
          class="capitalize"
          :icon="FilePenLine"
          >{{ contract.replace(/_/g, ' ').toLowerCase() }}</AmIChip
        >
        <AmIChip
          bg-colour="bg-slate-100"
          text-colour="text-slate-600"
          text-size="text-2xs"
          font="font-base"
          compact
          class="capitalize"
          :icon="CalendarRange"
          >{{ schedule.replace(/_/g, ' ').toLowerCase() }}</AmIChip
        >
      </div>
    </section>
    <footer class="py-2 px-4 flex justify-end">
      <AmIButton class="w-max" @click="handleViewRole">{{ $t('card.role.view-job') }}</AmIButton>
    </footer>
  </div>
</template>

<script setup lang="ts">
import {
  CalendarRange,
  Equal,
  FilePenLine,
  MapPinIcon,
  TrendingDown,
  TrendingUp
} from 'lucide-vue-next';
import { getRawUncappedDiffPercentage } from '~/helpers/utility';

import { sanitizeUrl } from '~~/shared/utils/sanitize';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  contract: {
    type: String,
    required: true
  },
  schedule: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  salaryMin: {
    type: Number,
    required: true
  },
  salaryMax: {
    type: Number,
    required: true
  },
  rawSalary: {
    type: String,
    default: ''
  },
  userSalary: {
    type: Number,
    default: 0
  },
  currencySymbol: {
    type: String,
    required: true
  },
  url: {
    type: String,
    default: ''
  }
});

const { trackViewRole } = useAnalytics();
const { $siteBrand } = useNuxtApp();

const companyInitial = computed<string>(
  () => props.company?.trim()?.charAt(0)?.toUpperCase() || '?'
);

const hasRange = computed<boolean>(() => {
  return (
    [props.salaryMin, props.salaryMax].filter((x) => Boolean(x)) &&
    props.salaryMax !== props.salaryMin
  );
});

const isSalaryProvided = computed<boolean>(() => {
  if (props.rawSalary) {
    return true;
  }
  return Boolean(props.salaryMin) || Boolean(props.salaryMax);
});

const salaryMaxComparison = computed<number>(() => {
  if (!props.userSalary || !isSalaryProvided.value) {
    return 0;
  }

  if ($siteBrand === 'benchmarkmyrole') {
    return getRawUncappedDiffPercentage(props.userSalary, props.salaryMax);
  }

  return getRawUncappedDiffPercentage(props.salaryMax, props.userSalary);
});

const comparisonChipAttributes = computed(() => {
  const background =
    salaryMaxComparison.value === 0
      ? 'bg-slate-200'
      : salaryMaxComparison.value < 0
        ? 'bg-negative-100'
        : 'bg-positive-100';
  const text =
    salaryMaxComparison.value === 0
      ? 'text-slate-400'
      : salaryMaxComparison.value < 0
        ? 'text-negative-900'
        : 'text-positive-900';
  const icon =
    salaryMaxComparison.value === 0
      ? Equal
      : salaryMaxComparison.value < 0
        ? TrendingDown
        : TrendingUp;

  return {
    bgColour: background,
    textColour: text,
    icon,
    textSize: 'text-sm',
    compact: true
  };
});

const salaryRange = computed(() => {
  if (!isSalaryProvided.value) {
    return useNuxtApp().$i18n.t('card.role.not-provided');
  }

  if (props.rawSalary) {
    return props.rawSalary;
  }

  const min = [props.currencySymbol, Math.round(props.salaryMin).toLocaleString()].join('');
  const max = [props.currencySymbol, Math.round(props.salaryMax).toLocaleString()].join('');

  return hasRange.value
    ? `${min} - ${max}`
    : [props.currencySymbol, Math.round(props.salaryMax || props.salaryMin).toLocaleString()].join(
        ''
      );
});

const handleViewRole = (): void => {
  trackViewRole(props.title, props.company, props.location, props.url);

  const safeUrl = sanitizeUrl(props.url);
  window.open(safeUrl, '_blank');
};
</script>

<style scoped></style>
