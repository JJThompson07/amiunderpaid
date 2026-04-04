<template>
  <div
    class="ami-role relative rounded-2xl flex flex-col flex-1 bg-white shadow-md overflow-hidden">
    <header class="flex gap-2 py-2 px-4 justify-between bg-secondary-50">
      <div class="ami-role-describe w-full">
        <h3 class="font-semibold line-clamp-1">{{ title }}</h3>
        <div class="flex flex-row gap-1 justify-between items-center w-full text-slate-500">
          <span class="text-2xs flex-1 line-clamp-1">{{ company }}</span>
          <span class="text-2xs flex gap-1 items-center line-clamp-1"
            ><MapPinIcon class="w-3 h-3" />{{ location }}</span
          >
        </div>
      </div>
    </header>
    <section class="ami-role-range flex flex-col gap-2 py-2 px-4">
      <div class="flex flex-col">
        <span class="uppercase text-2xs text-slate-400">{{ $t('card.role.salary') }}</span>
        <div class="flex flex-row items-center justify-between">
          <span class="text-xl font-bold">{{ salaryRange }}</span>
          <div>
            <div
              v-if="userSalary"
              class="flex flex-col items-end gap-1 text-sm text-right relative">
              <AmIChip v-bind="comparisonChipAttributes" text-size="text-sm" compact
                >{{ salaryMaxComparison }}%</AmIChip
              >
              <span
                class="text-2xs absolute top-full right-1/2 translate-x-1/2 w-max"
                :class="
                  salaryMaxComparison === 0
                    ? 'text-slate-400'
                    : salaryMaxComparison < 0
                      ? 'text-negative-900'
                      : 'text-positive-900'
                "
                >{{
                  salaryMaxComparison === 0
                    ? $t(`card.role.${$siteBrand}.compare.no-change`)
                    : salaryMaxComparison < 0
                      ? $t(`card.role.${$siteBrand}.compare.pay-cut`)
                      : $t(`card.role.${$siteBrand}.compare.pay-rise`)
                }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-row flex-wrap gap-1">
        <AmIChip
          bg-colour="bg-primary-100"
          text-size="text-2xs"
          font="font-base"
          compact
          :icon="FilePenLine"
          >{{ contract }}</AmIChip
        >
        <AmIChip
          bg-colour="bg-primary-100"
          text-size="text-2xs"
          font="font-base"
          compact
          :icon="CalendarRange"
          >{{ schedule }}</AmIChip
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
  userSalary: {
    type: Number,
    default: 0
  },
  marketAverage: {
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

const hasRange = computed<boolean>(() => {
  return (
    [props.salaryMin, props.salaryMax].filter((x) => Boolean(x)) &&
    props.salaryMax !== props.salaryMin
  );
});

const salaryMaxComparison = computed<number>(() => {
  if (!props.userSalary) return 0;

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
    icon
  };
});

const salaryRange = computed(() => {
  const min = [props.currencySymbol, Math.round(props.salaryMin).toLocaleString()].join('');
  const max = [props.currencySymbol, Math.round(props.salaryMax).toLocaleString()].join('');

  return hasRange.value
    ? `${min} - ${max}`
    : [props.currencySymbol, Math.round(props.salaryMax || props.salaryMin).toLocaleString()].join(
        ''
      );
});

const handleViewRole = () => {
  trackViewRole(props.title, props.company, props.location, props.url);

  window.open(props.url, '_blank');
};
</script>

<style scoped></style>
