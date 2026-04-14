<template>
  <div
    class="schedule-matrix bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
    <AmITable
      :columns="matrixColumns"
      :data="matrixRows"
      min-width="min-w-225"
      class="border-0! rounded-none! border-b! border-slate-200! pb-2">
      <template #header-target>
        {{ $t('recruiter.schedule.target-row') }}
      </template>

      <template
        v-for="month in upcomingMonths"
        :key="`header-${month.value}`"
        #[`header-month-${month.value}`]>
        <div class="flex flex-col items-center">
          <span class="text-xs uppercase tracking-wider text-slate-400 mb-1">{{ month.year }}</span>
          <span>{{ month.label }}</span>
        </div>
      </template>

      <template #target="{ row }">
        <div class="flex items-center justify-between">
          <div class="flex flex-col">
            <span class="font-bold text-slate-800 text-sm">{{ row.categoryLabel }}</span>
            <span class="text-slate-500 text-xs flex items-center gap-1">
              <MapPinIcon class="w-3 h-3" />
              {{ row.territory.name }}
            </span>
          </div>
          <span class="text-2xs font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
            Band {{ row.territory.band || 1 }}
          </span>
        </div>
      </template>

      <template #basic="{ row }">
        <button
          type="button"
          :disabled="isBasicLocked(row.id)"
          :class="[
            'px-3 py-2 rounded-xl font-bold text-xs transition-all duration-200 flex flex-col items-center justify-center gap-1 mx-auto w-full max-w-25',
            isBasicLocked(row.id)
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm cursor-not-allowed opacity-90'
              : isBasic(row.id)
                ? 'bg-secondary-700 text-white shadow-md ring-2'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-secondary-700'
          ]"
          @click="toggleBasic(row.id)">
          <div class="flex items-center gap-1.5">
            <CheckCircle2Icon
              v-if="isBasic(row.id) || isBasicLocked(row.id)"
              class="w-3.5 h-3.5"
              :class="isBasicLocked(row.id) ? 'text-emerald-500' : 'text-positive-400'" />
            <CircleIcon v-else class="w-3.5 h-3.5 text-slate-400" />
            <span v-if="isBasicLocked(row.id)" class="uppercase tracking-wider text-2xs"
              >Owned</span
            >
            <span v-else>Ongoing</span>
          </div>
          <span
            v-if="!isBasicLocked(row.id)"
            :class="isBasic(row.id) ? 'text-slate-300' : 'text-slate-400 font-medium'">
            {{ currencySymbol }}{{ getRowPricing(row.territory.band).basic }}/mo
          </span>
        </button>
      </template>

      <template
        v-for="(month, index) in upcomingMonths"
        :key="`cell-${month.value}`"
        #[`month-${month.value}`]="{ row }">
        <div class="flex flex-col items-center justify-start gap-1.5">
          <button
            type="button"
            :disabled="isMonthLocked(row.id, month.value)"
            :title="
              isMonthLocked(row.id, month.value)
                ? 'Already Owned'
                : isMonthSelected(row.id, month.value)
                  ? 'Downgrade'
                  : `Upgrade to Exclusive (${currencySymbol}${getRowPricing(row.territory.band).exclusive})`
            "
            :class="[
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200',
              isMonthLocked(row.id, month.value)
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-not-allowed opacity-90'
                : isMonthSelected(row.id, month.value)
                  ? 'bg-primary-50 text-primary-600 border border-primary-200 shadow-inner'
                  : 'bg-white border border-slate-200 text-slate-300 hover:border-primary-300 hover:text-primary-400 shadow-sm'
            ]"
            @click="toggleMonth(row.id, month.value)">
            <CheckCircle2Icon v-if="isMonthLocked(row.id, month.value)" class="w-5 h-5" />
            <CrownIcon v-else-if="isMonthSelected(row.id, month.value)" class="w-5 h-5" />
            <PlusIcon v-else class="w-4 h-4" />
          </button>

          <div class="h-4 flex items-center justify-center">
            <template
              v-if="getMonthDisplayPrice(row.id, month.value, index, row.territory.band) !== null">
              <span
                v-if="getMonthDisplayPrice(row.id, month.value, index, row.territory.band) === 0"
                class="text-2xs font-black text-positive-600 uppercase tracking-wider bg-positive-50 px-1.5 py-0.5 rounded-md border border-positive-100">
                Free
              </span>
              <span
                v-else
                class="text-2xs font-black px-1.5 py-0.5 rounded-md flex items-center gap-1"
                :class="
                  isMonthSelected(row.id, month.value)
                    ? 'bg-primary-50 text-primary-700'
                    : 'bg-slate-100 text-slate-500'
                ">
                {{ currencySymbol
                }}{{ getMonthDisplayPrice(row.id, month.value, index, row.territory.band) }}
                <span
                  v-if="index === 0 && isPastHalfway && isMonthSelected(row.id, month.value)"
                  class="text-3xs text-primary-400 whitespace-nowrap">
                  (50%)
                </span>
              </span>
            </template>
          </div>
        </div>
      </template>
    </AmITable>

    <div
      class="bg-slate-50 p-4 sm:px-6 flex flex-col lg:flex-row items-center justify-between gap-6 border-t border-slate-200">
      <div class="text-sm text-slate-500 font-medium text-center lg:text-left w-full lg:w-auto">
        <span v-if="matrixTotal > 0">
          <strong class="text-slate-700">7-Month Matrix Value:</strong> {{ currencySymbol
          }}{{ matrixTotal }}
        </span>
        <span v-else>Select "Ongoing" or specific months to build your schedule.</span>

        <div class="flex flex-col gap-1 mt-1.5 text-left">
          <p class="text-xs text-slate-400">
            * Ongoing Basic plans get the first month completely free.
          </p>
          <p class="text-xs text-slate-400 max-w-lg leading-relaxed">
            * Exclusive upgrades are secured today by paying the upgrade difference upfront. Your
            standard basic rate will be billed normally during the exclusive month.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 w-full lg:w-auto justify-end">
        <div
          class="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs flex flex-col items-end min-w-30">
          <span class="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-0.5"
            >Next Month</span
          >
          <span class="text-lg font-bold text-slate-600"
            >{{ currencySymbol }}{{ nextMonthTotal }}</span
          >
        </div>

        <div
          class="bg-white px-5 py-2.5 rounded-xl border shadow-sm flex flex-col items-end min-w-35 transition-all duration-300"
          :class="
            payNowTotal > 0 || matrixTotal > 0
              ? 'ring-2 ring-primary-500/20 border-primary-400'
              : 'border-slate-200'
          ">
          <span class="text-2xs font-black text-primary-600 uppercase tracking-wider mb-0.5"
            >Due Today</span
          >
          <span
            class="text-2xl font-black"
            :class="payNowTotal > 0 ? 'text-slate-900' : 'text-slate-400'">
            {{ currencySymbol }}{{ payNowTotal }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import { MapPinIcon, PlusIcon, CrownIcon, CheckCircle2Icon, CircleIcon } from 'lucide-vue-next';

export type Territory = { id: number; name: string; band?: number };

const props = defineProps({
  territories: { type: Array as PropType<Territory[]>, required: true },
  categories: { type: Array as PropType<string[]>, required: true },
  categoryOptions: {
    type: Array as PropType<{ label: string; value: string }[]>,
    default: () => []
  }
});

const emit = defineEmits(['update:selections', 'update:total']);

// Composables logic
const {
  matrixRows,
  upcomingMonths,
  currencySymbol,
  isPastHalfway,
  matrixTotal,
  payNowTotal,
  nextMonthTotal,
  toggleBasic,
  toggleMonth,
  isBasic,
  isMonthSelected,
  isBasicLocked,
  isMonthLocked,
  getMonthDisplayPrice,
  getRowPricing
} = useScheduleMath(props, emit);

// ------------------------------------------
// CREATE THE COLUMNS DYNAMICALLY FOR AmITable
// ------------------------------------------
const matrixColumns = computed(() => {
  // 1. Static Columns
  const baseCols = [
    {
      key: 'target',
      label: 'Industry & Region', // Fallback if slot isn't used
      class: 'sticky left-0 z-20 w-64 shadow-[1px_0_0_0_#e2e8f0]',
      cellClass: 'bg-white group-hover:bg-slate-50/50 sticky left-0 z-10 shadow-[1px_0_0_0_#f1f5f9]'
    },
    {
      key: 'basic',
      label: 'Basic Plan',
      class: 'text-center w-32 border-r border-dashed border-slate-200',
      cellClass: 'text-center border-r border-dashed border-slate-200'
    }
  ];

  // 2. Dynamic Month Columns
  const monthCols = upcomingMonths.value.map((month: any) => ({
    key: `month-${month.value}`,
    label: month.label, // Used as fallback
    class: 'text-center w-20',
    cellClass: 'text-center align-top'
  }));

  return [...baseCols, ...monthCols];
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
}
</style>
