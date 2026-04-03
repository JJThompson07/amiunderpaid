<template>
  <div class="min-h-screen bg-slate-50 p-4 pt-24 pb-32">
    <SectionSharedBackdrop bg-from="from-secondary-900/50" />
    <div class="p-6 md:p-8 max-w-7xl mx-auto w-full relative">
      <header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-slate-900">Job Groups Dictionary</h1>
          <p class="text-slate-500 mt-1">
            Manage official SOC codes and their mapped search synonyms.
          </p>
        </div>

        <div class="flex items-center gap-4">
          <AmIButton
            bg-colour="bg-warning-500"
            animation-colour="bg-warning-600"
            :loading="isMigrating"
            class="text-sm font-bold shadow-sm"
            @click="runMigration">
            {{ isMigrating ? 'Migrating...' : `Migrate ${activeCountry} Data` }}
          </AmIButton>

          <div class="flex bg-slate-100 p-1 rounded-lg">
            <button
              class="px-6 py-2 text-sm font-bold rounded-md transition-colors"
              :class="
                activeCountry === 'UK'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              "
              @click="activeCountry = 'UK'">
              🇬🇧 UK (ONS)
            </button>
            <button
              class="px-6 py-2 text-sm font-bold rounded-md transition-colors"
              :class="
                activeCountry === 'USA'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              "
              @click="activeCountry = 'USA'">
              🇺🇸 USA (BLS)
            </button>
          </div>
        </div>
      </header>

      <div
        class="mb-4 flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div class="w-full max-w-md">
          <AmIInputGeneric
            v-model="searchQuery"
            placeholder="Search by Group Name or SOC Code..."
            :icon="Search" />
        </div>
        <div class="text-sm font-bold text-slate-500">
          Showing {{ filteredGroups.length }} {{ activeCountry }} groups
        </div>
      </div>

      <div v-if="pending" class="text-slate-500 font-medium flex items-center gap-2">
        <span
          class="animate-spin h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full"></span>
        Loading dictionary...
      </div>

      <div v-else class="flex flex-col gap-4">
        <AmITable
          :columns="tableColumns"
          :data="paginatedGroups"
          empty-message="No groups found matching your search.">
          <template #id_code="{ value }">
            <span class="font-mono text-sm font-bold text-slate-500">{{ value }}</span>
          </template>

          <template #group_name="{ value }">
            <span class="text-sm font-bold text-slate-900">{{ value }}</span>
          </template>

          <template #titles="{ row }">
            <div class="flex flex-wrap gap-2 items-center">
              <div v-if="row.titles.length === 0" class="text-xs text-slate-400 italic py-1">
                No synonyms mapped yet.
              </div>

              <template v-else>
                <span
                  v-for="title in expandedRows[row.id_code]
                    ? row.titles
                    : row.titles.slice(0, CHIPS_LIMIT)"
                  :key="title"
                  class="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-md">
                  {{ title }}
                  <button
                    class="text-slate-400 hover:text-negative-600 transition-colors"
                    title="Remove"
                    @click="removeTitle(row.id_code, title)">
                    &times;
                  </button>
                </span>

                <button
                  v-if="row.titles.length > CHIPS_LIMIT"
                  class="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-200 border border-slate-200 px-2 py-1 rounded-md transition-colors shadow-sm ml-1"
                  @click="expandedRows[row.id_code] = !expandedRows[row.id_code]">
                  {{
                    expandedRows[row.id_code]
                      ? 'Show less'
                      : `+ ${row.titles.length - CHIPS_LIMIT} more`
                  }}
                </button>
              </template>
            </div>
          </template>

          <template #actions="{ row }">
            <form class="flex gap-2" @submit.prevent="addTitle(row.id_code)">
              <div class="w-full">
                <AmIInputGeneric
                  v-model="newInputs[row.id_code] as string"
                  placeholder="e.g. React Dev" />
              </div>

              <AmIButton
                bg-colour="bg-slate-800"
                animation-colour="bg-slate-900"
                :disabled="!newInputs[row.id_code] || isProcessing === row.id_code"
                class="text-xs shrink-0 h-12 rounded-xl flex items-center justify-center"
                @click="addTitle(row.id_code)">
                Add
              </AmIButton>
            </form>
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
import { ref, computed, reactive, watch } from 'vue';
import { Search } from 'lucide-vue-next';

definePageMeta({ middleware: 'admin' });

interface JobGroup {
  id_code: string;
  group_name: string;
  titles: string[];
}

const activeCountry = ref<'UK' | 'USA'>('UK');
const isProcessing = ref<string | null>(null);
const isMigrating = ref(false);
const newInputs = reactive<Record<string, string>>({});

// --- UI STATE ---
const expandedRows = reactive<Record<string, boolean>>({});
const CHIPS_LIMIT = 8;

// --- SEARCH & PAGINATION STATE ---
const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = 20;

// Reset to page 1 whenever the user types a new search or changes the country tab
watch([searchQuery, activeCountry], () => {
  currentPage.value = 1;
});

// --- NEW: Define AmITable Columns ---
// We map the cellClass to apply the alignment previously done on the <td>
const tableColumns = [
  { key: 'id_code', label: 'Code', class: 'w-24', cellClass: 'align-top pt-6' },
  { key: 'group_name', label: 'Group Name', class: 'w-1/4', cellClass: 'align-top pt-6' },
  { key: 'titles', label: 'Mapped Synonyms', cellClass: 'align-top pt-5' },
  { key: 'actions', label: 'Add Synonym', class: 'w-64 text-right', cellClass: 'align-top pt-4' }
];

// 1. Fetch Data
const { data, pending, refresh } = await useFetch('/api/admin/job-groups', {
  query: computed(() => ({ country: activeCountry.value })),
  watch: [activeCountry]
});

const groups = computed<JobGroup[]>(() => {
  return (data.value?.groups as JobGroup[]) || [];
});

// --- COMPUTED LOGIC ---
const filteredGroups = computed(() => {
  if (!searchQuery.value) return groups.value;

  const query = searchQuery.value.toLowerCase().trim();
  return groups.value.filter(
    (group) =>
      group.group_name.toLowerCase().includes(query) || group.id_code.toLowerCase().includes(query)
  );
});

const totalPages = computed(() => {
  return Math.ceil(filteredGroups.value.length / itemsPerPage) || 1;
});

const paginatedGroups = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredGroups.value.slice(start, end);
});

// 2. Add Title
const addTitle = async (idCode: string) => {
  const newTitle = newInputs[idCode];
  if (!newTitle) return;

  isProcessing.value = idCode;
  try {
    // 1. Save to Firestore
    await $fetch('/api/admin/job-groups/title', {
      method: 'POST',
      body: { country: activeCountry.value, idCode, newTitle }
    });
    newInputs[idCode] = '';
    await refresh();

    // 2. SILENT ALGOLIA SYNC
    await $fetch('/api/admin/job-groups/migrate', {
      method: 'POST',
      body: { country: activeCountry.value }
    });
  } catch {
    alert('Failed to add title');
  } finally {
    isProcessing.value = null;
  }
};

// 3. Remove Title
const removeTitle = async (idCode: string, titleToRemove: string) => {
  if (!confirm(`Are you sure you want to remove "${titleToRemove}"?`)) return;

  isProcessing.value = idCode;
  try {
    // 1. Remove from Firestore
    await $fetch('/api/admin/job-groups/title', {
      method: 'DELETE',
      body: { country: activeCountry.value, idCode, titleToRemove }
    });
    await refresh();

    // 2. SILENT ALGOLIA SYNC
    await $fetch('/api/admin/job-groups/migrate', {
      method: 'POST',
      body: { country: activeCountry.value }
    });
  } catch {
    alert('Failed to remove title');
  } finally {
    isProcessing.value = null;
  }
};

// 4. Run Migration
const runMigration = async () => {
  if (!confirm(`Are you sure you want to migrate ${activeCountry.value} data?`)) return;
  isMigrating.value = true;
  try {
    const res = await $fetch('/api/admin/job-groups/migrate', {
      method: 'POST',
      body: { country: activeCountry.value }
    });
    await refresh();
    alert(res.success ? 'Migration completed successfully.' : 'Migration failed.');
  } catch (e) {
    console.error(e);
    alert('Migration failed.');
  } finally {
    isMigrating.value = false;
  }
};
</script>
