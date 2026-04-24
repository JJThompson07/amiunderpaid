<template>
  <div class="min-h-screen bg-slate-50 p-4 pt-24 pb-32">
    <SectionSharedBackdrop bg-from="from-secondary-900/50" />

    <div class="px-6 md:px-8 max-w-7xl mx-auto w-full relative">
      <header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-slate-900">User Search Logs</h1>
          <p class="text-slate-500 mt-1">
            Live feed of the latest 100 searches across the platform.
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-3">
          <div
            class="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-end">
            <span class="text-2xs font-black text-slate-400 uppercase tracking-widest">Today</span>
            <span v-if="pending" class="text-2xl font-black text-slate-300 animate-pulse mt-1"
              >---</span
            >
            <div v-else class="flex flex-col items-end">
              <span class="text-2xl font-black text-primary-500 leading-none mt-1">
                {{ todayCount.toLocaleString() }}
              </span>
              <span class="text-xs text-slate-400 font-medium mt-1"> Searches </span>
            </div>
          </div>

          <div
            class="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-end">
            <span class="text-2xs font-black text-slate-400 uppercase tracking-widest"
              >Yesterday</span
            >
            <span v-if="pending" class="text-2xl font-black text-slate-300 animate-pulse mt-1"
              >---</span
            >
            <div v-else class="flex flex-col items-end">
              <span class="text-2xl font-black text-primary-500 leading-none mt-1">
                {{ yesterdayCount.toLocaleString() }}
              </span>
              <span class="text-xs text-slate-400 font-medium mt-1"> Searches </span>
            </div>
          </div>

          <div
            class="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-end">
            <span class="text-2xs font-black text-slate-400 uppercase tracking-widest"
              >Daily Avg</span
            >
            <span v-if="pending" class="text-2xl font-black text-slate-300 animate-pulse mt-1"
              >---</span
            >
            <div v-else class="flex flex-col items-end">
              <span class="text-2xl font-black text-primary-500 leading-none mt-1">
                {{ averageDailySearches.toLocaleString() }}
              </span>
              <span class="text-xs text-slate-400 font-medium mt-1"> Searches / Day </span>
            </div>
          </div>

          <div
            class="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-end">
            <span class="text-2xs font-black text-slate-400 uppercase tracking-widest"
              >Lifetime Searches</span
            >
            <span v-if="pending" class="text-2xl font-black text-slate-300 animate-pulse mt-1"
              >---</span
            >
            <div v-else class="flex flex-col items-end">
              <span class="text-2xl font-black text-primary-500 leading-none mt-1">
                {{ totalLifetimeSearches.toLocaleString() }}
              </span>
              <span class="text-xs text-slate-400 font-medium mt-1"> Since {{ sinceDate }} </span>
            </div>
          </div>
        </div>
      </header>
      <div
        class="mb-4 flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div class="w-full max-w-md">
          <AmIInputGeneric
            v-model="searchQuery"
            placeholder="Search by Job Title or Location..."
            :icon="Search" />
        </div>
        <div class="text-sm font-bold text-slate-500">
          Showing {{ filteredLogs.length }} searches
        </div>
      </div>

      <div v-if="pending" class="text-slate-500 font-medium flex items-center gap-2">
        <span
          class="animate-spin h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full"></span>
        Loading history...
      </div>

      <div v-else class="flex flex-col gap-4">
        <AmITable
          :columns="tableColumns"
          :data="colouredLogs"
          :row-class="(row) => row.rowClass"
          max-height="h-125"
          empty-message="No search logs match your query.">
          <template #formattedDate="{ value }">
            <span class="text-xs font-mono text-slate-500">{{ value }}</span>
          </template>

          <template #title="{ value }">
            <span class="font-bold text-slate-900 capitalize">{{ value }}</span>
          </template>

          <template #location="{ value }">
            <span class="text-sm text-slate-600 capitalize">
              {{ value || '-' }}
            </span>
          </template>

          <template #country="{ value }">
            <span
              class="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold"
              :class="value === 'USA' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'">
              {{ value }}
            </span>
          </template>

          <template #salary="{ value }">
            <span class="text-sm font-mono font-medium text-slate-600">
              {{ value && value > 0 ? value.toLocaleString() : '-' }}
            </span>
          </template>

          <template #schedule="{ value }">
            <span class="text-xs text-slate-500 capitalize">
              {{ value === 'full-time' ? 'FT' : value === 'part-time' ? 'PT' : '-' }}
            </span>
          </template>

          <template #contract="{ value }">
            <span class="text-xs text-slate-500 capitalize">
              {{ value === 'permanent' ? 'Perm' : value === 'contract' ? 'Cont' : '-' }}
            </span>
          </template>

          <template #brand="{ value }">
            <span class="text-2xs uppercase tracking-widest font-black text-slate-400">
              {{ value || 'Unknown' }}
            </span>
          </template>
        </AmITable>

        <div
          class="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <span class="text-sm text-slate-500">
            Page <span class="font-bold text-slate-900">{{ currentPage }}</span> of
            <span class="font-bold text-slate-900">{{ totalPages }}</span>
          </span>
          <div class="flex gap-2">
            <AmIButton
              bg-colour="bg-white"
              text-colour="text-slate-700"
              animation-colour="bg-slate-50"
              :disabled="currentPage === 1"
              class="text-sm border border-slate-200 shadow-none px-4! py-1.5!"
              @click="currentPage--">
              Previous
            </AmIButton>

            <AmIButton
              bg-colour="bg-white"
              text-colour="text-slate-700"
              animation-colour="bg-slate-50"
              :disabled="currentPage >= totalPages"
              class="text-sm border border-slate-200 shadow-none px-4! py-1.5!"
              @click="currentPage++">
              Next
            </AmIButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next';
import type { SearchLog } from '../../../server/api/user/search-logs.get';

definePageMeta({ middleware: 'admin' });

const tableColumns = [
  { key: 'formattedDate', label: 'Date / Time', class: 'w-40' },
  { key: 'title', label: 'Search Query', class: 'w-1/4' },
  { key: 'location', label: 'Location' },
  { key: 'salary', label: 'Salary Target' },
  { key: 'schedule', label: 'Hrs', class: 'w-16 text-center', cellClass: 'text-center' },
  { key: 'contract', label: 'Type', class: 'w-16 text-center', cellClass: 'text-center' },
  { key: 'country', label: 'Region', class: 'w-24 text-center', cellClass: 'text-center' },
  { key: 'brand', label: 'Platform', class: 'w-32 text-right', cellClass: 'text-right' }
];

// --- SEARCH & PAGINATION STATE ---
const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = 50;

// UPDATED: Now expecting totalCount from the backend
const { data, pending } = await useFetch<{
  success: boolean;
  totalCount: number;
  todayCount: number;
  yesterdayCount: number;
  oldestDate: string;
  averagePerDay: number;
  logs: SearchLog[];
}>('/api/user/search-logs', {
  query: { page: currentPage, limit: itemsPerPage }
});

const logs = computed(() => {
  return data.value?.logs || [];
});

// Computed property for the lifetime search count
const totalLifetimeSearches = computed(() => {
  return data.value?.totalCount || 0;
});

const sinceDate = computed(() => {
  return data.value?.oldestDate || 'the beginning';
});

const todayCount = computed(() => {
  return data.value?.todayCount || 0;
});

const yesterdayCount = computed(() => {
  return data.value?.yesterdayCount || 0;
});

const averageDailySearches = computed(() => {
  return data.value?.averagePerDay || 0;
});

// Reset to page 1 whenever the user types a new search
watch(searchQuery, () => {
  currentPage.value = 1;
});

// --- COMPUTED LOGIC ---
const filteredLogs = computed(() => {
  if (!searchQuery.value) return logs.value;

  const query = searchQuery.value.toLowerCase().trim();
  return logs.value.filter(
    (log: any) =>
      (log.title && log.title.toLowerCase().includes(query)) ||
      (log.location && log.location.toLowerCase().includes(query))
  );
});

const colouredLogs = computed(() => {
  let currentBg = 'bg-white';
  let lastDate = '';

  return filteredLogs.value.map((log: any, index: number) => {
    if (index === 0) lastDate = log.dateKey;

    if (log.dateKey && log.dateKey !== lastDate) {
      currentBg = currentBg === 'bg-white' ? 'bg-slate-50' : 'bg-white';
      lastDate = log.dateKey;
    }

    return {
      ...log,
      rowClass: currentBg,
      class: currentBg
    };
  });
});

const totalPages = computed(() => {
  return Math.ceil(totalLifetimeSearches.value / itemsPerPage) || 1;
});
</script>
