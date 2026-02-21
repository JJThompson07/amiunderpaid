<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4 pt-20">
    <div
      class="p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center max-w-lg w-full">
      <div class="mb-6 flex justify-center">
        <div
          class="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
          <BookOpen v-if="!user" class="w-8 h-8" />
          <Lock v-else class="w-8 h-8 text-emerald-500" />
        </div>
      </div>

      <h1 class="text-2xl font-black mb-2 text-slate-900">Coding Index Seeder</h1>
      <p class="text-slate-500 mb-8 text-sm">
        Map specific job titles to SOC codes.
        <br />
        <span :class="user ? 'text-emerald-600 font-bold' : 'text-amber-500'">{{
          user ? user.email : 'Connecting...'
        }}</span>
      </p>

      <div v-if="existingData.length > 0" class="mb-8">
        <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <h3 class="text-2xs font-bold uppercase tracking-widest text-slate-400 mb-3">
            Current Mappings
          </h3>
          <div class="flex flex-col justify-center gap-2">
            <div
              v-for="record in existingData"
              :key="record.country"
              class="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-bold text-slate-600 flex items-center gap-2 flex justify-between">
              <div class="flex gap-1">
                <span
                  class="w-10"
                  :class="record.country === 'UK' ? 'text-primary-600' : 'text-secondary-600'"
                  >{{ record.country }}</span
                >
                <span class="text-slate-300">|</span>
                <span class="text-slate-500 font-medium"
                  >{{ record.count.toLocaleString() }} titles</span
                >
              </div>
              <button
                :disabled="loading"
                class="ml-1 p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete this dataset"
                @click="deleteRecords(record.country)">
                <X class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-8 space-y-6">
        <div class="grid grid-cols-1 gap-4">
          <div class="flex flex-col gap-2">
            <label
              class="text-2xs font-bold uppercase tracking-widest text-slate-400 text-left ml-1">
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
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-2xs font-bold uppercase tracking-widest text-slate-400 text-left ml-1">
            Coding Index File
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

        <div class="flex items-center gap-3 px-2">
          <input
            id="overwrite"
            v-model="overwrite"
            type="checkbox"
            class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
          <label
            for="overwrite"
            class="text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer">
            Overwrite Existing Records
          </label>
        </div>
      </div>

      <div
        v-if="status"
        class="mb-8 bg-slate-900 rounded-2xl text-left overflow-hidden shadow-inner border border-slate-800">
        <div
          class="px-4 py-2 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
          <span class="text-2xs uppercase font-bold text-slate-500 tracking-wider"
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

      <div class="space-y-3">
        <AmIButton
          v-if="parsedData.length > 0"
          :loading="loading"
          block
          bg-colour="bg-emerald-600"
          animation-colour="bg-emerald-400"
          title="Sync mappings"
          @click="seedToFirestore">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="w-4 h-4" />
            <span>Sync {{ parsedData.length }} Mappings</span>
          </div>
        </AmIButton>

        <AmIButton
          v-else
          :loading="parsing"
          :disabled="!selectedFile"
          block
          :bg-colour="!selectedFile ? 'bg-slate-200' : 'bg-primary-600'"
          :text-colour="!selectedFile ? 'text-slate-400' : 'text-white'"
          title="Parse Index"
          @click="handleParse">
          <div class="flex items-center justify-center gap-2">
            <LoaderCircle v-if="parsing" class="w-4 h-4 animate-spin" />
            <span v-else>Parse Index</span>
          </div>
        </AmIButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ** imports **
import { ref, onMounted, watch } from 'vue';
import { BookOpen, UploadCloud, CheckCircle2, Lock, LoaderCircle, X } from 'lucide-vue-next';
import { useFirestore, useCurrentUser } from 'vuefire';
import { doc, collection, query, where, getCountFromServer, getDoc } from 'firebase/firestore';

interface JobTitleRecord {
  title: string;
  soc: string;
  group: string;
}

/**
 * PAGE METADATA
 */
definePageMeta({
  middleware: 'admin'
});

// ** data & refs **
const db = useFirestore();
const user = useCurrentUser();

const parsing = ref(false);
const { status, consoleRef, log } = useConsoleLog();
const { loading, batchDelete, batchSeed } = useAdminClient(log);

const targetCountry = ref('UK');
const overwrite = ref(false);
const selectedFile = ref<File | null>(null);
const fileName = ref('');
const parsedData = ref<JobTitleRecord[]>([]);
const existingData = ref<{ country: string; count: number }[]>([]);

// ** methods **

const fetchSummary = async () => {
  if (!db) return;
  const countries = ['UK', 'USA'];
  const results: { country: string; count: number }[] = [];

  for (const country of countries) {
    const q = query(collection(db, 'job_titles'), where('country', '==', country));
    const snapshot = await getCountFromServer(q);
    const count = snapshot.data().count;
    if (count > 0) {
      results.push({ country, count });
    }
  }
  existingData.value = results;
};

const onFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    selectedFile.value = file;
    fileName.value = file.name;
    parsedData.value = [];
    log(`Selected: ${file.name}`);
    log(`Ready to parse. Click 'Parse Index' below.`);
  }
};

const deleteRecords = async (country: string) => {
  if (!db) return;
  if (
    !confirm(
      `Are you sure you want to delete ALL job title mappings for ${country}? This cannot be undone.`
    )
  ) {
    return;
  }

  // 1. Delete from Firestore
  await batchDelete('job_titles', { country }, `${country} mappings`);

  // 2. Delete from Algolia
  log(`Clearing Algolia records for ${country}...`);
  try {
    await $fetch('/api/admin/clear-algolia', {
      method: 'POST',
      body: {
        indexName: 'job_titles',
        filters: `country:${country}`
      }
    });
    log('✅ Algolia index cleared.');
  } catch (e: any) {
    log(`⚠️ Failed to clear Algolia: ${e.message}`);
  }

  await fetchSummary();
};

const handleParse = async () => {
  if (!selectedFile.value) return;

  parsing.value = true;
  log(`Initiating upload...`);

  const formData = new FormData();
  formData.append('file', selectedFile.value);

  try {
    log(`Sending file to server parser...`);
    const response = await $fetch<{
      success: boolean;
      data: JobTitleRecord[];
      count: number;
      error?: string;
    }>('/api/admin/parse-coding-index', {
      method: 'POST',
      body: formData
    });

    if (response.success) {
      parsedData.value = response.data;

      log(`✅ SUCCESS: Parsed ${response.count} valid mappings.`);
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
  if (loading.value || parsedData.value.length === 0 || !db) return;

  // Helper to generate consistent IDs
  const getRecordId = (record: JobTitleRecord) => {
    const cleanTitle = record.title
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_\-+.#]/g, '');
    const cleanSoc = record.soc.replace(/[^a-z0-9]/gi, '');
    return `${targetCountry.value}-${cleanTitle}-${cleanSoc}`.toLowerCase();
  };

  loading.value = true;

  const recordsToSeed: JobTitleRecord[] = [];

  try {
    if (overwrite.value) {
      log('⚠️ Overwrite mode enabled. Skipping existence check...');
      recordsToSeed.push(...parsedData.value);
    } else {
      log('Checking for existing records to save write quota...');
      const total = parsedData.value.length;
      let checked = 0;
      const checkChunkSize = 50; // Parallel reads

      // 1. Filter out existing records
      for (let i = 0; i < total; i += checkChunkSize) {
        const chunk = parsedData.value.slice(i, i + checkChunkSize);
        const results = await Promise.all(
          chunk.map(async (record) => {
            const docId = getRecordId(record);
            const docRef = doc(db, 'job_titles', docId);
            const snap = await getDoc(docRef);
            return snap.exists() ? null : record;
          })
        );
        recordsToSeed.push(...(results.filter((r) => r !== null) as JobTitleRecord[]));
        checked += chunk.length;
        if (checked % 500 === 0 || checked === total) {
          log(`Checked ${checked}/${total}. Found ${recordsToSeed.length} new records.`);
        }
      }
    }

    if (recordsToSeed.length === 0) {
      log('All records already exist. Nothing to sync.');
      loading.value = false;
      return;
    }

    // 2. Batch write new records
    const recordsToSync: any[] = [];

    recordsToSeed.forEach((record) => {
      const docId = getRecordId(record);
      const finalRecord = {
        title: record.title,
        searchTitle: record.title
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
        soc: record.soc,
        group: record.group,
        country: targetCountry.value,
        updatedAt: new Date(),
        objectID: docId
      };

      recordsToSync.push(finalRecord);
    });

    await batchSeed(recordsToSync, 'job_titles');

    // 3. Sync to Algolia
    log(`Syncing to Algolia index 'job_titles'...`);
    await $fetch('/api/admin/sync-algolia', {
      method: 'POST',
      body: { data: recordsToSync, indexName: 'job_titles' }
    });
    log('✅ Algolia Sync Complete.');

    parsedData.value = [];
    selectedFile.value = null;
    fileName.value = '';
    await fetchSummary();
  } catch (e: any) {
    log(`❌ Error: ${e.message}`);
    loading.value = false;
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
    navigateTo('/admin/login');
  }
});

watch(user, (newUser) => {
  if (!newUser) {
    navigateTo('/admin/login');
  } else {
    fetchSummary();
  }
});
</script>
