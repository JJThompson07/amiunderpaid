<template>
  <div class="min-h-screen bg-slate-50 p-4 pt-24 pb-32">
    <SectionSharedBackdrop bg-from="from-secondary-900/50" />

    <div class="px-6 md:px-8 max-w-7xl mx-auto w-full relative">
      <header class="mb-8">
        <h1 class="text-2xl font-black text-slate-900">{{ $t('admin.sessions.title') }}</h1>
        <p class="text-slate-500 mt-1">{{ $t('admin.sessions.subtitle') }}</p>
      </header>

      <!-- Month Pagination -->
      <div class="flex items-center justify-between mb-6 bg-white rounded-xl shadow-sm px-5 py-3">
        <button
          class="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          @click="changeMonth(-1)"
        >
          <span class="text-lg">←</span>
          {{ $t('admin.sessions.prev-month') }}
        </button>

        <span class="text-base font-black text-slate-900 tracking-wide">{{ monthLabel }}</span>

        <button
          class="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="isCurrentMonth"
          @click="changeMonth(1)"
        >
          {{ $t('admin.sessions.next-month') }}
          <span class="text-lg">→</span>
        </button>
      </div>

      <!-- Monthly Total -->
      <div v-if="!pending && sessions.length" class="mb-4 text-right text-sm text-slate-500">
        {{ $t('admin.sessions.monthly-total') }}:
        <span class="font-black text-slate-900 text-base ml-1">{{ monthlyTotal }}</span>
      </div>

      <AmITable :columns="tableColumns" :data="sessions" :loading="pending">
        <template #date="{ item }">
          <span class="font-bold text-slate-900">{{ item.id }}</span>
        </template>
        <template #locations="{ item }">
          <div class="flex flex-col gap-1 py-2">
            <div v-for="(cities, country) in item.locations" :key="country" class="text-xs">
              <span class="font-bold text-slate-700">{{ country }}:</span>
              <span class="text-slate-500 ml-1">
                {{ Object.entries(cities).map(([city, count]) => `${city}: ${count}`).join(', ') }}
              </span>
            </div>
          </div>
        </template>
        <template #total="{ item }">
          <span class="font-black text-slate-900 text-lg">{{ item.total }}</span>
        </template>
      </AmITable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports';
import { useCollection, useFirestore } from 'vuefire';
import { collection, orderBy, query, where } from 'firebase/firestore';

definePageMeta({ middleware: 'admin' });

const { t } = useI18n();

const tableColumns = [
  { key: 'date', label: t('admin.sessions.col-date'), class: 'w-48' },
  { key: 'locations', label: t('admin.sessions.col-locations') },
  { key: 'total', label: t('admin.sessions.col-total'), class: 'w-48 text-right', cellClass: 'text-right pr-4' }
];

// --- Month Navigation ---
const now = new Date();
const currentYear = ref(now.getUTCFullYear());
const currentMonth = ref(now.getUTCMonth()); // 0-indexed

const monthLabel = computed(() => {
  const date = new Date(currentYear.value, currentMonth.value, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
});

const isCurrentMonth = computed(() => {
  return currentYear.value === now.getUTCFullYear() && currentMonth.value === now.getUTCMonth();
});

const changeMonth = (delta: number) => {
  const date = new Date(currentYear.value, currentMonth.value + delta, 1);
  currentYear.value = date.getFullYear();
  currentMonth.value = date.getMonth();
};

// Build YYYY-MM-DD range strings for the selected month
const monthStart = computed(() => {
  const m = String(currentMonth.value + 1).padStart(2, '0');
  return `${currentYear.value}-${m}-01`;
});

const monthEnd = computed(() => {
  const next = new Date(currentYear.value, currentMonth.value + 1, 1);
  const m = String(next.getMonth() + 1).padStart(2, '0');
  return `${next.getFullYear()}-${m}-01`;
});

// --- Firestore Query (reactive to month changes) ---
const db = useFirestore();
const sessionsRef = collection(db, 'user_sessions');

const sessionsQuery = computed(() =>
  query(
    sessionsRef,
    where('__name__', '>=', monthStart.value),
    where('__name__', '<', monthEnd.value),
    orderBy('__name__', 'desc')
  )
);

const { data: sessions, pending } = useCollection(sessionsQuery);

const monthlyTotal = computed(() =>
  sessions.value.reduce((sum: number, s: any) => sum + (s.total || 0), 0)
);
</script>
