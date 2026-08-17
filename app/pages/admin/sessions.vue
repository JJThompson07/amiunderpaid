<template>
  <div class="min-h-screen bg-slate-50 p-4 pt-24 pb-32">
    <SectionSharedBackdrop bg-from="from-secondary-900/50" />

    <div class="px-6 md:px-8 max-w-7xl mx-auto w-full relative">
      <header class="mb-8">
        <h1 class="text-2xl font-black text-slate-900">User Sessions</h1>
        <p class="text-slate-500 mt-1">Daily aggregation of user sessions and geolocation.</p>
      </header>
      
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
import { collection, orderBy, query } from 'firebase/firestore';

definePageMeta({ middleware: 'admin' });

const tableColumns = [
  { key: 'date', label: 'Date', class: 'w-48' },
  { key: 'locations', label: 'Location Breakdown' },
  { key: 'total', label: 'Total Visits', class: 'w-48 text-right', cellClass: 'text-right pr-4' }
];

const db = useFirestore();
const sessionsRef = collection(db, 'user_sessions');
const sessionsQuery = query(sessionsRef, orderBy('__name__', 'desc'));

const { data: sessions, pending } = useCollection(sessionsQuery);
</script>
