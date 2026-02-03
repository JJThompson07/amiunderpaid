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

      <!-- CONFIGURATION SECTION -->
      <div class="mb-8 space-y-6">
        <div class="grid grid-cols-2 gap-4">
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
                @click="targetCountry = c">
                {{ c }}
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
import { ref, onMounted, nextTick, watch } from 'vue';
import { Database, UploadCloud, CheckCircle2, Lock, LoaderCircle } from 'lucide-vue-next';
import { useFirestore, useCurrentUser } from 'vuefire';
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import type { SalaryRecord } from '../../../utils/seedData';

/**
 * PAGE METADATA
 * * Registers the 'admin' middleware to protect this route.
 */
definePageMeta({
  middleware: 'admin',
});

// ** data & refs **
const db = useFirestore();
const user = useCurrentUser();

const loading = ref(false);
const parsing = ref(false);
const status = ref('');
const consoleRef = ref<HTMLElement | null>(null);

const targetCountry = ref('UK');
const targetYear = ref(2026);
const selectedFile = ref<File | null>(null);
const fileName = ref('');
const parsedData = ref<SalaryRecord[]>([]);

// ** methods **

/**
 * LOG HELPER
 * * Appends messages to the internal console and auto-scrolls.
 */
const log = (msg: string) => {
  status.value += `> ${msg}\n`;
  nextTick(() => {
    if (consoleRef.value) consoleRef.value.scrollTop = consoleRef.value.scrollHeight;
  });
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

const handleParse = async () => {
  // 1. Validation checks
  if (!selectedFile.value) return;

  parsing.value = true;
  log(`Initiating upload: ${targetCountry.value} data...`);

  const formData = new FormData();
  formData.append('file', selectedFile.value);
  formData.append('country', targetCountry.value);
  formData.append('year', targetYear.value.toString());

  try {
    // 2. Request parsing from server API
    log(`Sending file to server parser...`);
    const response = await $fetch<{
      success: boolean;
      data: SalaryRecord[];
      count: number;
      error?: string;
    }>('/api/admin/parse', {
      method: 'POST',
      body: formData,
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
    const dataToSeed = [...parsedData.value];
    const chunkSize = 400;
    let totalSynced = 0;

    // 2. Process in chunks to stay under Firebase limits
    while (dataToSeed.length > 0) {
      const batch = writeBatch(db);
      const currentChunk = dataToSeed.splice(0, chunkSize);

      log(`Writing batch: ${totalSynced + 1} to ${totalSynced + currentChunk.length}...`);

      for (const record of currentChunk) {
        // Create deterministic IDs
        const cleanTitle = record.title
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_-]/g, '');
        const docId =
          `${record.country}-${record.location}-${cleanTitle}-${record.year}`.toLowerCase();

        const docRef = doc(db, 'salary_benchmarks', docId);

        batch.set(docRef, {
          ...record,
          searchTitle: record.title.toLowerCase(),
          searchLocation: record.location.toLowerCase(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      totalSynced += currentChunk.length;
      log(`Committed ${totalSynced} records...`);
    }

    log(`\n🏆 ALL DONE: ${totalSynced} records are now live.`);
    parsedData.value = [];
    selectedFile.value = null;
    fileName.value = '';
  } catch (e: any) {
    log(`\n❌ FIREBASE ERROR: ${e.message}`);
    console.error('Firestore Error:', e);
  } finally {
    loading.value = false;
  }
};

// ** lifecycle **
onMounted(() => {
  log('System booting...');
  if (user.value) {
    log(`Authenticated as admin: ${user.value.email}.`);
  } else {
    log('Checking authentication...');
    navigateTo('/login');
  }
});

watch(user, (newUser) => {
  if (!newUser) {
    navigateTo('/login');
  }
});
</script>
