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
          <h3 class="text-2xs font-bold uppercase tracking-widest text-slate-400 mb-3">
            Current Database Records
          </h3>
          <div class="flex flex-col justify-center gap-2">
            <div
              v-for="record in existingData"
              :key="record.country + record.year + record.scope"
              class="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-bold text-slate-600 flex items-center gap-2 justify-between">
              <div class="flex items-center gap-2">
                <span
                  class="w-10"
                  :class="record.country === 'UK' ? 'text-primary-600' : 'text-secondary-600'"
                  >{{ record.country }}</span
                >
                <span class="text-slate-300">|</span>
                <span>{{ record.year }}</span>
                <span class="text-slate-300">|</span>
                <span class="uppercase text-2xs font-bold tracking-wider text-slate-400">{{
                  record.period
                }}</span>
                <span class="text-slate-300">|</span>
                <span class="uppercase text-2xs font-bold tracking-wider text-indigo-400">{{
                  record.scope
                }}</span>
                <span class="text-slate-300">|</span>
                <span class="text-slate-500 font-medium"
                  >{{ formatCount(record.count) }} records</span
                >
              </div>
              <button
                :disabled="loading"
                class="ml-1 p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete this dataset"
                @click="deleteRecords(record.country, record.year, record.period, record.scope)">
                <X class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- CONFIGURATION SECTION -->
      <div class="mb-8 space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <!-- COUNTRY TOGGLE -->
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
                @click="setCountry(c)">
                {{ c }}
              </button>
            </div>
          </div>

          <!-- SCOPE TOGGLE -->
          <div class="flex flex-col gap-2">
            <label
              class="text-2xs font-bold uppercase tracking-widest text-slate-400 text-left ml-1">
              Data Scope
            </label>
            <div class="flex p-1 bg-slate-100 rounded-xl">
              <button
                v-for="s in ['National', 'Regional']"
                :key="s"
                class="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                :class="
                  targetScope === s.toLowerCase()
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                "
                @click="targetScope = s.toLowerCase()">
                {{ s }}
              </button>
            </div>
          </div>

          <!-- PERIOD TOGGLE (UK ONLY) -->
          <div class="flex flex-col gap-2">
            <label
              class="text-2xs font-bold uppercase tracking-widest text-slate-400 text-left ml-1">
              Pay Period
            </label>
            <div class="flex p-1 bg-slate-100 rounded-xl">
              <button
                v-for="p in ['Year', 'Hour', 'Week']"
                :key="p"
                :disabled="targetCountry !== 'UK' || p !== 'Year'"
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
              class="text-2xs font-bold uppercase tracking-widest text-slate-400 text-left ml-1">
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
          <label class="text-2xs font-bold uppercase tracking-widest text-slate-400 text-left ml-1">
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
          <p class="text-2xs text-slate-400 text-left ml-1">
            Expected source: {{ expectedSource }}
          </p>
        </div>
      </div>

      <!-- PROCESSING CONSOLE -->
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
            class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </div>
        <div v-if="progress" class="px-4 pt-3">
          <div class="flex justify-between text-2xs font-bold text-slate-400 mb-1">
            <span>{{ progress.label }}</span>
            <span>{{ formatCount(progress.done) }} / {{ formatCount(progress.total) }}</span>
          </div>
          <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-500 transition-all duration-300 ease-out"
              :style="{ width: `${(progress.done / progress.total) * 100}%` }" />
          </div>
        </div>
        <div
          ref="consoleRef"
          class="p-5 overflow-y-auto max-h-48 font-mono text-[11px] text-emerald-400 whitespace-pre-wrap leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
          {{ status }}
        </div>
      </div>

      <!-- ACTION BUTTONS -->
      <div class="space-y-3">
        <AmIAnimatedBorder
          v-if="parsedData.length > 0"
          :loading="loading"
          block
          bg-colour="bg-slate-400"
          animation-colour="bg-secondary-400">
          <AmIButton
            v-if="parsedData.length > 0"
            :loading="loading"
            block
            bg-colour="bg-secondary-600"
            animation-colour="bg-secondary-400"
            title="Sync Records"
            @click="seedToFirestore">
            <div class="flex items-center gap-2">
              <CheckCircle2 class="w-4 h-4" />
              <span>Sync {{ formatCount(parsedData.length) }} Records</span>
            </div>
          </AmIButton>
        </AmIAnimatedBorder>

        <AmIAnimatedBorder
          v-else
          :loading="parsing"
          block
          bg-colour="bg-slate-400"
          animation-colour="bg-primary-400">
          <AmIButton
            :loading="parsing"
            :disabled="!selectedFile"
            block
            :bg-colour="!selectedFile ? 'bg-slate-200' : 'bg-primary-600'"
            :text-colour="!selectedFile ? 'text-slate-400' : 'text-white'"
            title="Parse Spreadsheet"
            @click="handleParse">
            <div class="flex items-center justify-center gap-2">
              <LoaderCircle v-if="parsing" class="w-4 h-4 animate-spin" />
              <span v-else>Parse Spreadsheet</span>
            </div>
          </AmIButton>
        </AmIAnimatedBorder>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, Database, LoaderCircle, Lock, UploadCloud, X } from 'lucide-vue-next';
import type { BenchmarkSummaryRow } from '../../../server/api/admin/benchmark-summary.get';
import type { GovParseOptions, GovSalaryRecord } from '~~/shared/utils/govSpreadsheet';
import { isLatestYear } from '~~/shared/utils/benchmarkYear';

/**
 * PAGE METADATA
 * * Registers the 'admin' middleware to protect this route.
 */
definePageMeta({
  middleware: 'admin'
});

const adminFetch = useAdminFetch();

// ** data & refs **
const user = useCurrentUser();

const parsing = ref(false);
const { status, consoleRef, log, logProgress } = useConsoleLog();
const { loading, progress, batchDelete, batchSeed, batchSyncSearch } = useAdminClient(
  log,
  logProgress
);

const targetScope = ref('national'); // 'national' | 'regional'
const targetCountry = ref('UK');
const targetPeriod = ref('year');
const targetYear = ref(new Date().getFullYear());
const selectedFile = ref<File | null>(null);
const fileName = ref('');
// shallow: tens of thousands of records are only ever replaced wholesale, never mutated in place
const parsedData = shallowRef<GovSalaryRecord[]>([]);
// set once parsedData is in Firestore, so a retry after a search-sync failure skips straight to
// the search step instead of re-writing every document
const firestoreSynced = ref(false);
// the scope the current parsedData was parsed as, so changing the toggle afterwards can't send
// national rows to the regional collection (or vice versa)
const parsedScope = ref<GovParseOptions['scope']>('national');
const existingData = ref<BenchmarkSummaryRow[]>([]);

// ** methods **

const fetchSummary = async (): Promise<void> => {
  try {
    const rows = await adminFetch<BenchmarkSummaryRow[]>('/api/admin/benchmark-summary');
    existingData.value = rows.sort(
      (a, b) =>
        b.year - a.year || a.country.localeCompare(b.country) || a.scope.localeCompare(b.scope)
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    log(`❌ Could not load current database records: ${message}`);
  }
};

// which government spreadsheet each country/scope combination's parser expects
const expectedSource = computed(() => {
  if (targetCountry.value === 'UK') {
    return targetScope.value === 'national'
      ? 'ONS ASHE Table 14.7a (Occupation, 4-digit SOC)'
      : 'ONS ASHE Table 7.7a (Work Geography)';
  }
  return targetScope.value === 'national'
    ? 'BLS OEWS National (OCC_TITLE, A_MEDIAN)'
    : 'BLS OEWS State/Area (AREA_TITLE, OCC_TITLE, A_MEDIAN)';
});

const setCountry = (c: string): void => {
  targetCountry.value = c;
  if (c === 'USA') {
    targetPeriod.value = 'year';
  }
};

const clearParsed = (): void => {
  parsedData.value = [];
  firestoreSynced.value = false;
};

const onFileSelect = (e: Event): void => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  // reset so choosing the same file again still fires @change
  target.value = '';
  if (file) {
    selectedFile.value = file;
    fileName.value = file.name;
    clearParsed();
    log(`Selected: ${file.name}`);
    log(`Ready to parse. Click 'Parse Spreadsheet' below.`);
  }
};

// Firestore years already held for a country's regional data (from the summary)
const regionalYears = (country: string): number[] =>
  existingData.value
    .filter((row) => row.scope === 'Regional' && row.country === country)
    .map((row) => row.year);

// Search holds only the newest regional year per country (Firestore keeps every year), so the
// record quota doesn't grow with each yearly upload. Lookups only ever serve one year anyway.
const pruneOlderRegionalYears = async (
  country: string,
  year: number,
  period: string
): Promise<void> => {
  log(`Removing ${country} regional years before ${year} from search (Firestore keeps them)...`);
  try {
    await adminFetch('/api/admin/clear-algolia', {
      method: 'POST',
      body: {
        indexName: 'regional_salary_benchmarks',
        filters: `country:${country} AND period:${period} AND year < ${year}`
      }
    });
    log('✅ Older regional years removed from search.');
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    log(`⚠️ Could not remove older regional years from search: ${message}`);
  }
};

const deleteRecords = async (
  country: string,
  year: number,
  period: string,
  scope: string
): Promise<void> => {
  if (
    !confirm(
      `Are you sure you want to delete ALL ${scope} records for ${country} ${year} (${period})? This cannot be undone.`
    )
  ) {
    return;
  }

  const collectionName = scope === 'National' ? 'salary_benchmarks' : 'regional_salary_benchmarks';
  const filters = { country, year, period };

  // 1. Delete from Firestore
  await batchDelete(collectionName, filters, `${country} ${year} (${period}) data`);

  // 2. Delete from Algolia
  log(`Clearing Algolia records for ${country} ${year}...`);
  try {
    await adminFetch('/api/admin/clear-algolia', {
      method: 'POST',
      body: {
        indexName: collectionName,
        filters: `country:${country} AND year:${year} AND period:${period}`
      }
    });
    log('✅ Algolia index cleared.');
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    log(`⚠️ Failed to clear Algolia: ${message}`);
  }

  if (scope === 'Regional' && isLatestYear(year, regionalYears(country))) {
    log(
      `⚠️ Search only holds the newest regional year, so it has no ${country} regional data until a year is synced again.`
    );
  }

  await fetchSummary();
};

const handleParse = async (): Promise<void> => {
  if (!selectedFile.value) {
    return;
  }

  parsing.value = true;
  clearParsed();
  const options: GovParseOptions = {
    country: targetCountry.value === 'USA' ? 'USA' : 'UK',
    scope: targetScope.value === 'regional' ? 'regional' : 'national',
    year: Number(targetYear.value)
  };
  log(
    `Parsing ${selectedFile.value.name} in the browser as ${options.country} ${options.scope} ${options.year}...`
  );

  try {
    const started = Date.now();
    // loaded on demand so the spreadsheet library only ships to admins who parse a file
    const { parseGovernmentWorkbook, readGovernmentWorkbook } =
      await import('~~/shared/utils/govSpreadsheet');
    const data = await selectedFile.value.arrayBuffer();
    // parsing blocks the main thread; let the spinner and log line paint first
    await new Promise((resolve) => setTimeout(resolve, 0));
    const workbook = readGovernmentWorkbook(data);
    const { records, skipped } = parseGovernmentWorkbook(workbook, options);

    if (records.length === 0) {
      log('❌ PARSE ERROR: no usable rows found. Check the file matches the expected source.');
      return;
    }

    parsedData.value = records;
    parsedScope.value = options.scope;
    const locations = new Set(records.map((r) => r.location)).size;
    const titles = new Set(records.map((r) => r.title)).size;
    log(
      `✅ Parsed ${formatCount(records.length)} records in ${((Date.now() - started) / 1000).toFixed(1)}s`
    );
    log(
      `   ${formatCount(titles)} occupation(s) × ${formatCount(locations)} location(s), ${formatCount(skipped)} row(s) skipped (suppressed or no median)`
    );
    log(`Review the summary, then click 'Sync' to write to Firestore and search.`);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    log(`❌ PARSE ERROR: ${message}`);
  } finally {
    parsing.value = false;
  }
};

const seedToFirestore = async (): Promise<void> => {
  if (loading.value || parsedData.value.length === 0) {
    return;
  }

  const collectionName =
    parsedScope.value === 'national' ? 'salary_benchmarks' : 'regional_salary_benchmarks';
  const { country, year, period } = parsedData.value[0]!;
  const regional = parsedScope.value === 'regional';
  // search keeps only the newest regional year; an older one goes to Firestore alone
  const syncSearch = !regional || isLatestYear(year, regionalYears(country));

  const recordsToSync = parsedData.value.map((record) => {
    // deterministic IDs, so a retry overwrites rather than duplicates
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

    return {
      ...record,
      searchTitle: record.title.toLowerCase(),
      searchLocation: record.location.toLowerCase(),
      updatedAt: new Date(), // Use Date instead of serverTimestamp for JSON compatibility
      objectID: docId // For Algolia
    };
  });

  log(`Syncing ${formatCount(recordsToSync.length)} records to '${collectionName}'...`);
  // held across all three steps; batchSeed/batchSyncSearch leave a caller-owned loading alone
  loading.value = true;

  try {
    if (firestoreSynced.value) {
      log('Firestore already holds these records; retrying the search sync only.');
    } else {
      try {
        await batchSeed(recordsToSync, collectionName);
      } catch {
        log(
          'Nothing was sent to search. Click Sync again to retry; already-written records are overwritten.'
        );
        return;
      }
      firestoreSynced.value = true;
    }

    if (syncSearch) {
      try {
        await batchSyncSearch(recordsToSync, collectionName);
      } catch {
        // the parsed data is kept, and the next Sync skips the Firestore step
        log('Firestore was updated but search was not. Click Sync again to retry the search sync.');
        return;
      }
      if (regional) {
        await pruneOlderRegionalYears(country, year, period);
      }
    } else {
      log(
        `Search keeps only the newest ${country} regional year, so ${year} was written to Firestore only.`
      );
    }

    clearParsed();
    selectedFile.value = null;
    fileName.value = '';
    log('🏆 All done. Refreshing the database summary...');
    await fetchSummary();
  } finally {
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

// the summary already covers both scopes, so switching scope needs no refetch
watch(targetScope, (newScope) => {
  if (newScope === 'regional') {
    targetPeriod.value = 'year';
  }
});

// country and year are baked into each parsed record, so changing either (or the scope) after
// parsing discards the result rather than letting Sync write the old values
watch([targetCountry, targetYear, targetScope], () => {
  if (parsedData.value.length > 0) {
    clearParsed();
    log('Settings changed: parsed data discarded. Click Parse Spreadsheet to parse again.');
  }
});
</script>
