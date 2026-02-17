<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4 pt-20">
    <div
      class="p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center max-w-lg w-full">
      <!-- ICON HEADER -->
      <div class="mb-6 flex justify-center">
        <div
          class="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
          <TrendingUp class="w-8 h-8" />
        </div>
      </div>

      <h1 class="text-2xl font-black mb-2 text-slate-900">Adzuna Admin</h1>
      <p class="text-slate-500 mb-8 text-sm">Manage Adzuna API data and categories.</p>

      <!-- CATEGORY SYNC SECTION -->
      <div class="mb-8">
        <div class="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
          <h3 class="text-2xs font-bold uppercase tracking-widest text-indigo-400 mb-3">
            Adzuna Categories
          </h3>
          <div class="flex flex-col gap-3">
            <div class="flex justify-center gap-2 mb-2">
              <button
                v-for="c in ['UK', 'USA']"
                :key="c"
                class="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                :class="
                  targetCountry === c
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-500 border border-slate-200'
                "
                @click="targetCountry = c">
                {{ c }}
              </button>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-sm text-indigo-900 font-medium"
                >Sync {{ targetCountry }} Categories</span
              >
              <button
                :disabled="syncingCategories"
                class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                @click="handleSyncCategories">
                {{ syncingCategories ? 'Syncing...' : 'Sync Now' }}
              </button>
            </div>
            <div v-if="categoryStatus" class="text-xs text-indigo-600 font-mono">
              {{ categoryStatus }}
            </div>
          </div>
        </div>
      </div>

      <!-- CATEGORY LIST SECTION -->
      <div class="pt-6 mt-6 border-t border-slate-100">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-slate-900">Managed Categories</h3>
          <div class="flex items-center gap-2">
            <button
              v-if="storedCategories.length > 0"
              :disabled="loadingStored"
              class="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
              @click="saveStoredCategories">
              <Save class="w-3 h-3" />
              <span>Save List</span>
            </button>
            <button
              class="text-slate-400 hover:text-indigo-600 p-1.5"
              @click="fetchStoredCategories">
              <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loadingStored }" />
            </button>
          </div>
        </div>

        <div v-if="loadingStored" class="py-4 text-xs text-slate-400">Loading...</div>
        <div v-else-if="storedCategories.length === 0" class="py-4 text-xs text-slate-400">
          No categories found.
        </div>

        <div
          v-else
          class="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
          <div
            v-for="cat in storedCategories"
            :key="cat.id"
            class="flex items-center justify-between p-3 text-left border bg-slate-50 rounded-xl border-slate-100">
            <div class="flex-1 min-w-0 mr-3">
              <div class="text-xs font-bold truncate text-slate-700" :title="cat.label">
                {{ cat.label }}
              </div>
              <div class="text-[10px] text-slate-400 font-mono truncate" :title="cat.tag">
                {{ cat.tag }}
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <input
                v-model.number="cat.cache"
                type="number"
                step="5"
                class="w-16 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { TrendingUp, Save, RefreshCw } from 'lucide-vue-next';
import { useFirestore } from 'vuefire';
import { doc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * PAGE METADATA
 * * Registers the 'admin' middleware to protect this route.
 */
definePageMeta({
  middleware: 'admin'
});

const db = useFirestore();
const { fetchCategories, categories } = useAdzuna();

const targetCountry = ref('UK');
const syncingCategories = ref(false);
const categoryStatus = ref('');
const storedCategories = ref<any[]>([]);
const loadingStored = ref(false);

const handleSyncCategories = async () => {
  if (!db) return;
  syncingCategories.value = true;
  categoryStatus.value = `Fetching ${targetCountry.value} categories...`;

  try {
    await fetchCategories(targetCountry.value);

    if (!categories.value || categories.value.length === 0) {
      categoryStatus.value = 'No categories returned from API.';
      return;
    }

    categoryStatus.value = `Saving ${categories.value.length} categories...`;

    const batch = writeBatch(db);

    categories.value.forEach((cat) => {
      const id = `${targetCountry.value}-${cat.tag}`.toLowerCase();
      const ref = doc(db, 'adzuna_categories', id);
      batch.set(ref, {
        ...cat,
        country: targetCountry.value,
        cache: 120,
        updatedAt: new Date()
      });
    });

    await batch.commit();
    categoryStatus.value = `✅ Synced ${categories.value.length} categories.`;
    await fetchStoredCategories();
  } catch (e: any) {
    console.error(e);
    categoryStatus.value = `❌ Error: ${e.message}`;
  } finally {
    syncingCategories.value = false;
  }
};

const fetchStoredCategories = async () => {
  if (!db) return;
  loadingStored.value = true;
  try {
    const q = query(
      collection(db, 'adzuna_categories'),
      where('country', '==', targetCountry.value)
    );
    const snapshot = await getDocs(q);
    storedCategories.value = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a: any, b: any) => a.label.localeCompare(b.label));
  } catch (e) {
    console.error('Error fetching stored categories:', e);
  } finally {
    loadingStored.value = false;
  }
};

const saveStoredCategories = async () => {
  if (!db) return;
  loadingStored.value = true;
  try {
    const batch = writeBatch(db);
    storedCategories.value.forEach((cat) => {
      const ref = doc(db, 'adzuna_categories', cat.id);
      batch.update(ref, { cache: cat.cache });
    });
    await batch.commit();
  } catch (e) {
    console.error('Error saving categories:', e);
    alert('Failed to save categories');
  } finally {
    loadingStored.value = false;
  }
};

watch(targetCountry, fetchStoredCategories);

onMounted(() => {
  fetchStoredCategories();
});
</script>
