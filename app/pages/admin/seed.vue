<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4 pt-20">
    <div
      class="p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center max-w-lg w-full">
      <!-- ICON HEADER -->
      <div class="mb-6 flex justify-center">
        <div
          class="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
          <Database v-if="!user" class="w-8 h-8" />
          <Lock v-else class="w-8 h-8 text-emerald-500" />
        </div>
      </div>

      <h1 class="text-2xl font-black mb-2 text-slate-900">Government Data Seeder</h1>
      <p class="text-slate-500 mb-8 text-sm">
        Authorized Session:
        <span :class="user ? 'text-emerald-600 font-bold' : 'text-amber-500'">{{
          user ? user.email : 'Connecting...'
        }}</span>
      </p>

      <!-- DATABASE STATUS -->
      <div v-if="existingData.length > 0" class="mb-8">
        <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            Current Database Records
          </h3>
          <div class="flex flex-col justify-center gap-2">
            <div
              v-for="record in existingData"
              :key="record.country + record.year"
              class="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-bold text-slate-600 flex items-center gap-2 flex justify-between">
              <div class="flex gap-1">
                <span
                  class="w-10"
                  :class="record.country === 'UK' ? 'text-primary-600' : 'text-secondary-600'"
                  >{{ record.country }}</span
                >
                <span class="text-slate-300">|</span>
                <span>{{ record.year }}</span>
                <span class="text-slate-300">|</span>
                <span class="uppercase text-[10px] font-bold tracking-wider text-slate-400">{{
                  record.period
                }}</span>
                <span class="text-slate-300">|</span>
                <span class="text-slate-500 font-medium"
                  >{{ record.count.toLocaleString() }} records</span
                >
              </div>
              <button
                :disabled="loading"
                class="ml-1 p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete this dataset"
                @click="deleteRecords(record.country, record.year, record.period)">
                <X class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- CONFIGURATION SECTION -->
      <div class="mb-8 space-y-6">
        <div class="grid grid-cols-3 gap-4">
          <!-- COUNTRY TOGGLE -->
          <div class="flex flex-col gap-2">
            <label
              class="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-left ml-1">
              Region
            </label>
            <div class="flex p-1 bg-slate-100 rounded-xl">
              <button
                v-for="c in ['UK', 'USA']"
                :key="c"
                class="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                :class="
                  targetCountry === c
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                "
                @click="setCountry(c)">
                {{ c }}
              </button>
            </div>
          </div>

          <!-- PERIOD TOGGLE (UK ONLY) -->
          <div class="flex flex-col gap-2">
            <label
              class="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-left ml-1">
              Pay Period
            </label>
            <div class="flex p-1 bg-slate-100 rounded-xl">
              <button
                v-for="p in ['Year', 'Hour', 'Week']"
                :key="p"
                :disabled="targetCountry === 'USA'"
                class="flex-1 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                :class="
                  targetPeriod === p.toLowerCase()
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                "
                @click="targetPeriod = p.toLowerCase()">
                {{ p }}
              </button>
            </div>
          </div>

          <!-- YEAR INPUT -->
          <div class="flex flex-col gap-2">
            <label
              class="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-left ml-1">
              Target Year
            </label>
            <input
              v-model="targetYear"
              type="number"
              class="w-full px-4 py-2 text-sm font-bold text-center bg-slate-100 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-slate-600" />
          </div>
        </div>

        <!-- FILE UPLOAD -->
        <div class="flex flex-col gap-2">
          <label
            class="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-left ml-1">
            Spreadsheet File
          </label>
          <label
            class="flex flex-col items-center px-4 py-8 bg-slate-50 text-indigo-600 rounded-2xl border-2 border-dashed border-slate-200 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group">
            <UploadCloud
              class="w-10 h-10 mb-2 text-slate-300 group-hover:text-indigo-400 transition-colors" />
            <span
              class="text-xs font-bold uppercase tracking-wide text-slate-500 group-hover:text-indigo-600">
              {{ fileName || 'Select .xlsx or .csv' }}
            </span>
            <input type="file" class="hidden" accept=".xlsx,.csv" @change="onFileSelect" />
          </label>
        </div>
      </div>

      <!-- PROCESSING CONSOLE -->
      <div
        v-if="status"
        class="mb-8 bg-slate-900 rounded-2xl text-left overflow-hidden shadow-inner border border-slate-800">
        <div
          class="px-4 py-2 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
          <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider"
            >Processing Console</span
          >
          <span
            v-if="loading || parsing"
            class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        </div>
        <div
          ref="consoleRef"
          class="p-5 overflow-y-auto max-h-48 font-mono text-[11px] text-emerald-400 whitespace-pre-wrap leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
          {{ status }}
        </div>
      </div>

      <!-- ACTION BUTTONS -->
      <div class="space-y-3">
        <AmIButton
          v-if="parsedData.length > 0"
          :loading="loading"
          block
          bg-colour="bg-emerald-600"
          animation-colour="bg-emerald-400"
          @click="seedToFirestore">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="w-4 h-4" />
            <span>Sync {{ parsedData.length }} Records</span>
          </div>
        </AmIButton>

        <AmIButton
          v-else
          :loading="parsing"
          :disabled="!selectedFile"
          block
          :bg-colour="!selectedFile ? 'bg-slate-200' : 'bg-primary-600'"
          :text-colour="!selectedFile ? 'text-slate-400' : 'text-white'"
          @click="handleParse">
          <div class="flex items-center justify-center gap-2">
            <LoaderCircle v-if="parsing" class="w-4 h-4 animate-spin" />
            <span v-else>Parse Spreadsheet</span>
          </div>
        </AmIButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ** imports **
import { ref, onMounted, watch } from 'vue';
import { Database, UploadCloud, CheckCircle2, Lock, LoaderCircle, X } from 'lucide-vue-next';
import { useFirestore, useCurrentUser } from 'vuefire';
import {
  doc,
  serverTimestamp,
  collection,
  query,
  where,
  getCountFromServer
} from 'firebase/firestore';
import type { SalaryRecord } from '../../../utils/seedData';

/**
 * PAGE METADATA
 * * Registers the 'admin' middleware to protect this route.
 */
definePageMeta({
  middleware: 'admin'
});

// ** data & refs **
const db = useFirestore();
const user = useCurrentUser();

const parsing = ref(false);
const { status, consoleRef, log } = useConsoleLog();
const { loading, batchDelete, batchSeed } = useFirestoreAdmin(log);

const targetCountry = ref('UK');
const targetPeriod = ref('year');
const targetYear = ref(2026);
const selectedFile = ref<File | null>(null);
const fileName = ref('');
const parsedData = ref<(SalaryRecord & { period: string })[]>([]);
const existingData = ref<{ country: string; year: number; period: string; count: number }[]>([]);

// ** methods **

const fetchSummary = async () => {
  if (!db) return;
  const countries = ['UK', 'USA'];
  const periods = ['year', 'hour', 'week'];

  // Generate last 5 years dynamically
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i + 1);

  const results: { country: string; year: number; period: string; count: number }[] = [];

  for (const country of countries) {
    for (const year of years) {
      for (const period of periods) {
        const q = query(
          collection(db, 'salary_benchmarks'),
          where('country', '==', country),
          where('year', '==', year),
          where('period', '==', period)
        );
        const snapshot = await getCountFromServer(q);
        const count = snapshot.data().count;
        if (count > 0) {
          results.push({ country, year, period, count });
        }
      }
    }
  }
  existingData.value = results.sort(
    (a, b) => b.year - a.year || a.country.localeCompare(b.country)
  );
};

const setCountry = (c: string) => {
  targetCountry.value = c;
  if (c === 'USA') {
    targetPeriod.value = 'year';
  }
};

const onFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    selectedFile.value = file;
    fileName.value = file.name;
    parsedData.value = [];
    log(`Selected: ${file.name}`);
    log(`Ready to parse. Click 'Parse Spreadsheet' below.`);
  }
};

const deleteRecords = async (country: string, year: number, period: string) => {
  if (!db) return;
  if (
    !confirm(
      `Are you sure you want to delete ALL records for ${country} ${year} (${period})? This cannot be undone.`
    )
  ) {
    return;
  }

  const q = query(
    collection(db, 'salary_benchmarks'),
    where('country', '==', country),
    where('year', '==', year),
    where('period', '==', period)
  );
  await batchDelete(q, `${country} ${year} (${period}) data`);
  await fetchSummary();
};

const handleParse = async () => {
  // 1. Validation checks
  if (!selectedFile.value) return;

  parsing.value = true;
  log(`Initiating upload: ${targetCountry.value} data...`);

  const formData = new FormData();
  formData.append('file', selectedFile.value);
  formData.append('country', targetCountry.value);
  formData.append('year', targetYear.value.toString());
  formData.append('period', targetPeriod.value);

  try {
    // 2. Request parsing from server API
    log(`Sending file to server parser...`);
    const response = await $fetch<{
      success: boolean;
      data: (SalaryRecord & { period: string })[];
      count: number;
      error?: string;
    }>('/api/admin/parse', {
      method: 'POST',
      body: formData
    });

    if (response.success) {
      parsedData.value = response.data;
      log(`✅ SUCCESS: Parsed ${response.count} valid records.`);
      log(`Review the results above, then click 'Sync' to write to Firestore.`);
    } else {
      log(`❌ PARSE ERROR: ${response.error}`);
    }
  } catch (e: any) {
    log(`❌ NETWORK ERROR: ${e.message}`);
  } finally {
    parsing.value = false;
  }
};

const seedToFirestore = async () => {
  // 1. Pre-flight check
  if (loading.value || parsedData.value.length === 0 || !db) return;

  loading.value = true;
  log('Starting Firestore Batch Sync...');

  try {
    await batchSeed(parsedData.value, (record) => {
      // Create deterministic IDs
      const cleanTitle = record.title
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_\-+#.]/g, ''); // Allow +, #, . for C++, C#, .NET
      const cleanLocation = record.location
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_\-+.#]/g, '');
      const docId =
        `${record.country}-${cleanLocation}-${cleanTitle}-${record.year}-${record.period}`.toLowerCase();

      const docRef = doc(db, 'salary_benchmarks', docId);

      // Generate keywords for search (split by space, comma, parens, dash)
      const keywords = record.title
        .toLowerCase()
        .split(/[\s,()-]+/)
        .filter((k) => k.length > 1);

      return {
        ref: docRef,
        data: {
          ...record,
          searchTitle: record.title.toLowerCase(),
          searchLocation: record.location.toLowerCase(),
          keywords,
          updatedAt: serverTimestamp()
        }
      };
    });

    parsedData.value = [];
    selectedFile.value = null;
    fileName.value = '';
    await fetchSummary();
  } catch (e) {
    console.error(e);
    loading.value = false;
    // Error logging handled in composable
  }
};

// ** lifecycle **
onMounted(() => {
  log('System booting...');
  if (user.value) {
    log(`Authenticated as admin: ${user.value.email}.`);
    fetchSummary();
  } else {
    log('Checking authentication...');
    navigateTo('/login');
  }
});

watch(user, (newUser) => {
  if (!newUser) {
    navigateTo('/login');
  } else {
    fetchSummary();
  }
});
</script>
