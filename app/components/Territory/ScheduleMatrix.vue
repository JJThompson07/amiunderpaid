<template>
  <div
    class="schedule-matrix bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
    <div class="overflow-x-auto custom-scrollbar pb-4">
      <table class="w-full text-left border-collapse min-w-[900px]">
        <thead>
          <tr>
            <th
              class="p-4 border-b border-slate-200 bg-slate-50 font-black text-slate-800 sticky left-0 z-20 w-64 shadow-[1px_0_0_0_#e2e8f0]">
              {{ $t('recruiter.schedule.target-row') || 'Industry & Region' }}
            </th>
            <th
              class="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-600 text-center text-sm w-32 border-r border-dashed">
              Basic Plan
            </th>
            <th
              v-for="month in upcomingMonths"
              :key="month.value"
              class="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-600 text-center text-sm w-20">
              <div class="flex flex-col items-center">
                <span class="text-xs uppercase tracking-wider text-slate-400 mb-1">{{
                  month.year
                }}</span>
                <span>{{ month.label }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in matrixRows"
            :key="row.id"
            class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
            <td
              class="p-4 bg-white group-hover:bg-slate-50/50 sticky left-0 z-10 shadow-[1px_0_0_0_#f1f5f9]">
              <div class="flex flex-col">
                <span class="font-bold text-slate-800 text-sm">{{ row.categoryLabel }}</span>
                <span class="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                  <MapPinIcon class="w-3 h-3" />
                  {{ row.territory.name }}
                </span>
              </div>
            </td>

            <td class="p-3 text-center border-r border-dashed border-slate-200">
              <button
                type="button"
                :class="[
                  'px-4 py-2 rounded-xl font-bold text-xs transition-all duration-200 flex items-center gap-2 mx-auto',
                  isBasic(row.id)
                    ? 'bg-slate-800 text-white shadow-md ring-2 ring-slate-800/20'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                ]"
                @click="toggleBasic(row.id)">
                <CheckCircle2Icon v-if="isBasic(row.id)" class="w-4 h-4 text-positive-400" />
                <CircleIcon v-else class="w-4 h-4 text-slate-400" />
                Ongoing
              </button>
            </td>

            <td v-for="month in upcomingMonths" :key="month.value" class="p-3 text-center">
              <button
                type="button"
                title="Upgrade to Exclusive"
                :class="[
                  'w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all duration-200',
                  isMonthSelected(row.id, month.value)
                    ? 'bg-primary-50 text-primary-600 border border-primary-200 shadow-inner'
                    : 'bg-white border border-slate-200 text-slate-300 hover:border-primary-300 hover:text-primary-400 shadow-sm'
                ]"
                @click="toggleMonth(row.id, month.value)">
                <CrownIcon v-if="isMonthSelected(row.id, month.value)" class="w-5 h-5" />
                <PlusIcon v-else class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type PropType } from 'vue';
import { MapPinIcon, PlusIcon, CrownIcon, CheckCircle2Icon, CircleIcon } from 'lucide-vue-next';

export type Territory = { id: number; name: string };

const props = defineProps({
  territories: {
    type: Array as PropType<Territory[]>,
    required: true
  },
  categories: {
    type: Array as PropType<string[]>,
    required: true
  },
  categoryOptions: {
    type: Array as PropType<{ label: string; value: string }[]>,
    default: () => []
  }
});

const emit = defineEmits(['update:selections']);

// State Definition
type RowConfiguration = {
  isBasic: boolean;
  selectedMonths: Set<string>;
};

const rowConfigs = ref<Map<string, RowConfiguration>>(new Map());

const getCategoryLabel = (val: string) => {
  const found = props.categoryOptions.find((c) => c.value === val);
  return found ? found.label : val;
};

// Generate Time Columns
const upcomingMonths = computed(() => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      value: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
      label: targetDate.toLocaleString('default', { month: 'short' }),
      year: targetDate.getFullYear()
    });
  }
  return months;
});

// Generate Rows
const matrixRows = computed(() => {
  const rows = [];
  for (const territory of props.territories) {
    for (const category of props.categories) {
      const rowId = `${territory.id}|${category}`;
      rows.push({
        id: rowId,
        territory,
        categoryValue: category,
        categoryLabel: getCategoryLabel(category)
      });

      // Initialize state (Default to nothing selected)
      if (!rowConfigs.value.has(rowId)) {
        rowConfigs.value.set(rowId, { isBasic: false, selectedMonths: new Set() });
      }
    }
  }
  return rows;
});

// --- INTERACTION LOGIC ---

const isBasic = (rowId: string) => rowConfigs.value.get(rowId)?.isBasic || false;

const isMonthSelected = (rowId: string, monthValue: string) => {
  return rowConfigs.value.get(rowId)?.selectedMonths.has(monthValue) || false;
};

const toggleBasic = (rowId: string) => {
  const config = rowConfigs.value.get(rowId);
  if (!config) return;
  config.isBasic = !config.isBasic; // Toggle independently
  emitUpdates();
};

const toggleMonth = (rowId: string, monthValue: string) => {
  const config = rowConfigs.value.get(rowId);
  if (!config) return;

  if (config.selectedMonths.has(monthValue)) {
    config.selectedMonths.delete(monthValue);
  } else {
    config.selectedMonths.add(monthValue);
  } // Toggle independently
  emitUpdates();
};

// Emit ONLY configured rows to the parent
const emitUpdates = () => {
  const payload = [];

  for (const row of matrixRows.value) {
    const config = rowConfigs.value.get(row.id);
    if (!config) continue;

    // Only send rows where the user has actually selected a plan or months
    if (config.isBasic || config.selectedMonths.size > 0) {
      payload.push({
        territoryId: row.territory.id,
        territoryName: row.territory.name,
        categoryValue: row.categoryValue,
        isBasic: config.isBasic,
        exclusiveMonths: Array.from(config.selectedMonths) // Will be empty array if none selected
      });
    }
  }

  emit('update:selections', payload);
};

// Watch for changes in selected territories/categories from Step 1
watch(matrixRows, emitUpdates, { immediate: true });
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
