<template>
  <div
    class="ami-table overflow-auto rounded-2xl border border-slate-200 custom-scrollbar bg-white"
    :class="[maxHeight]">
    <table class="w-full text-left border-collapse" :class="[minWidth]">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            class="sticky top-0 z-10 p-4 bg-slate-50 font-bold text-slate-400 text-xs uppercase tracking-wider [box-shadow:inset_0_-1px_0_0_#cad5e2]"
            :class="[col.class]">
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!data || data.length === 0">
          <td :colspan="columns.length" class="p-8 text-center text-sm font-medium text-slate-400">
            {{ emptyMessage }}
          </td>
        </tr>

        <tr
          v-for="(row, rowIndex) in data"
          v-else
          :key="rowIndex"
          class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors last:border-b-0">
          <td
            v-for="col in columns"
            :key="col.key"
            class="p-4 align-middle"
            :class="[col.cellClass]">
            <slot :name="col.key" v-bind="{ row, index: rowIndex, value: row[col.key] }">
              <span class="text-sm font-medium text-slate-700">{{ row[col.key] }}</span>
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';

type TableColumn = {
  key: string;
  label: string;
  class?: string;
  cellClass?: string;
};

defineProps({
  columns: {
    type: Array as PropType<TableColumn[]>,
    required: true
  },
  data: {
    type: Array as PropType<any[]>,
    required: true
  },
  minWidth: {
    type: String,
    default: 'min-w-[400px]'
  },
  maxHeight: {
    type: String,
    default: ''
  },
  emptyMessage: {
    type: String,
    default: 'No data available.'
  }
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
