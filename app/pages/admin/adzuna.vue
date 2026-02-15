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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { TrendingUp } from 'lucide-vue-next';
import { useFirestore } from 'vuefire';
import { doc, writeBatch } from 'firebase/firestore';

definePageMeta({
  middleware: 'admin'
});

const db = useFirestore();
const { fetchCategories, categories } = useAdzuna();

const targetCountry = ref('UK');
const syncingCategories = ref(false);
const categoryStatus = ref('');

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
        updatedAt: new Date()
      });
    });

    console.log(JSON.stringify(categories.value));

    await batch.commit();
    categoryStatus.value = `✅ Synced ${categories.value.length} categories.`;
  } catch (e: any) {
    console.error(e);
    categoryStatus.value = `❌ Error: ${e.message}`;
  } finally {
    syncingCategories.value = false;
  }
};
</script>
