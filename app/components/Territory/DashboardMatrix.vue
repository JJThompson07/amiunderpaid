<template>
  <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
    <AmITable
      :columns="matrixColumns"
      :data="territories"
      min-width="min-w-[800px]"
      class="border-0! rounded-none!">
      <template #header-target>{{ $t('recruiter.schedule.target-row') }}</template>

      <template
        v-for="month in displayMonths"
        :key="`header-${month.value}`"
        #[`header-month-${month.value}`]>
        <div class="flex flex-col items-center">
          <span class="text-xs uppercase tracking-wider text-slate-400 mb-1">{{ month.year }}</span>
          <span>{{ month.label }}</span>
        </div>
      </template>

      <template #header-actions><span class="sr-only">Actions</span></template>

      <template #target="{ row }">
        <div class="flex flex-col">
          <span class="font-bold text-slate-800 text-sm">{{
            getCategoryLabel(row.categoryValue)
          }}</span>
          <div class="flex items-center gap-1.5 mt-0.5">
            <MapPinIcon class="w-3.5 h-3.5 text-slate-400" />
            <span class="text-slate-500 text-xs">{{ getTerritoryName(row.territoryId) }}</span>
          </div>
        </div>
      </template>

      <template
        v-for="month in displayMonths"
        :key="`cell-${month.value}`"
        #[`month-${month.value}`]="{ row }">
        <div class="flex flex-col items-center justify-center gap-1">
          <div
            v-if="isExclusive(row, month.value)"
            class="bg-primary-100 text-primary-800 border border-primary-400 px-2 py-1 rounded-md flex items-center justify-center gap-1.5 text-2xs uppercase tracking-wider font-bold shadow-inner w-full max-w-22.5">
            <CrownIcon class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Excl</span>
          </div>

          <div
            v-else-if="row.isBasic"
            class="bg-secondary-50 text-secondary-800 border border-secondary-400 px-2 py-1 rounded-md flex items-center justify-center gap-1.5 text-2xs uppercase tracking-wider font-bold w-full max-w-22.5">
            <CheckSquareIcon class="w-3 h-3" />
            <span class="hidden sm:inline">Basic</span>
          </div>

          <div v-else class="text-slate-300 text-xs font-medium">--</div>

          <span
            v-if="isExclusive(row, month.value) || row.isBasic"
            class="text-2xs font-bold"
            :class="isExclusive(row, month.value) ? 'text-primary-600' : 'text-secondary-600'">
            {{ currencySymbol }}{{ getCellPrice(row.territoryId, isExclusive(row, month.value)) }}
          </span>
        </div>
      </template>

      <template #actions="{ row }">
        <div class="flex justify-end items-center gap-1">
          <AmIIconButton
            title="Edit Schedule"
            bg-colour="bg-transparent"
            bg-hover-colour="hover:bg-primary-100"
            text-colour="text-primary-600"
            @click="$emit('edit', row.territoryId)">
            <PencilIcon class="w-4 h-4" />
          </AmIIconButton>

          <AmIIconButton
            title="Cancel Territory"
            bg-colour="bg-transparent"
            bg-hover-colour="hover:bg-negative-100"
            text-colour="text-negative-600"
            spinner-colour="border-negative-500/30 border-t-negative-500"
            :loading="isCancelling === row.territoryId"
            @click="$emit('cancel', row.territoryId)">
            <TrashIcon class="w-4 h-4" />
          </AmIIconButton>
        </div>
      </template>
    </AmITable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import { MapPinIcon, CrownIcon, CheckSquareIcon, TrashIcon, PencilIcon } from 'lucide-vue-next';

defineProps({
  territories: {
    type: Array as PropType<any[]>,
    required: true
  },
  isCancelling: {
    type: [Number, Boolean] as PropType<number | boolean | null>,
    default: null
  }
});

defineEmits(['cancel', 'edit']);

// 1. Composables
const { categories: categoriesData } = useCategories();
const { getTerritoryById } = useTerritories();
const { userProfile } = useUserProfile();
const { pricingData } = usePricing(); // Pull in live pricing!

// 2. Generate Rolling 7 Months
const displayMonths = computed(() => {
  const months = [];
  const currentDate = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    const year = date.getFullYear();
    const monthNum = String(date.getMonth() + 1).padStart(2, '0');
    months.push({
      value: `${year}-${monthNum}`,
      label: date.toLocaleString('default', { month: 'short' }),
      year: year
    });
  }
  return months;
});

// 3. Formatting Helpers
const getTerritoryName = (id: number) => {
  const t = getTerritoryById(id);
  return t ? t.name : `Region #${id}`;
};

const getCategoryLabel = (val: string) => {
  if (!categoriesData.value) return val;
  const found = categoriesData.value.find((c: any) => c.id === val || c.label === val);
  return found ? found.label || found.id : val;
};

// 4. Status Checking
const isExclusive = (territory: any, monthValue: string) => {
  return territory.exclusiveMonths && territory.exclusiveMonths.includes(monthValue);
};

// 5. Pricing Logic
const currencySymbol = computed(() => {
  return userProfile.value?.billingCountry === 'USA' ? '$' : '£';
});

const getCellPrice = (territoryId: number, isExcl: boolean) => {
  if (!pricingData.value) return '--'; // Handle loading state gracefully

  const t = getTerritoryById(territoryId);
  const band = t ? t.band : 1;

  const billingCountry = userProfile.value?.billingCountry || 'UK';
  const countryPricing = pricingData.value[billingCountry];

  if (!countryPricing) return '--';

  const bandKey = `band${band}`;
  const bandData = countryPricing[bandKey];

  // Return the exclusive price if it's an exclusive month, otherwise the basic price
  return isExcl ? bandData?.exclusive || '--' : bandData?.basic || '--';
};

// 6. Dynamic Column Config for AmITable
const matrixColumns = computed(() => {
  const baseCols = [
    {
      key: 'target',
      label: 'Industry & Region',
      class: 'sticky left-0 z-20 w-48 shadow-[1px_0_0_0_#e2e8f0]',
      cellClass: 'bg-white sticky left-0 z-10 shadow-[1px_0_0_0_#f1f5f9]'
    }
  ];

  const monthCols = displayMonths.value.map((m) => ({
    key: `month-${m.value}`,
    label: m.label,
    class: 'text-center w-24',
    cellClass: 'text-center align-middle'
  }));

  const actionCol = [{ key: 'actions', label: '', class: 'w-12', cellClass: 'text-right' }];

  return [...baseCols, ...monthCols, ...actionCol];
});
</script>
