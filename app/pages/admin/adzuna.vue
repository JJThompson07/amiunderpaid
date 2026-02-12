<template>
  <div class="min-h-screen bg-slate-50 pt-24 pb-12 px-4">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-slate-900 mb-8">Adzuna Categories Management</h1>

      <div class="grid md:grid-cols-2 gap-6">
        <!-- UK Card -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h2 class="text-xl font-bold text-slate-900">UK Categories</h2>
              <p class="text-sm text-slate-500 mt-1">
                {{ ukCategories?.results?.length || 0 }} categories cached
              </p>
            </div>
            <div v-if="ukLastUpdated" class="text-xs text-slate-400 text-right">
              Updated:<br />
              {{ ukLastUpdated }}
            </div>
          </div>

          <div
            class="h-64 bg-slate-50 rounded-lg border border-slate-200 mb-4 overflow-auto p-3 text-xs font-mono">
            <div v-if="ukCategories">
              <div v-for="cat in ukCategories.results" :key="cat.tag" class="mb-1">
                <span class="font-bold text-slate-700">{{ cat.label }}</span>
                <span class="text-slate-400"> ({{ cat.tag }})</span>
              </div>
            </div>
            <div v-else class="h-full flex items-center justify-center text-slate-400 italic">
              No data cached
            </div>
          </div>

          <AmIButton
            :loading="loadingUK"
            class="w-full justify-center"
            @click="fetchCategories('gb')">
            Fetch & Cache UK Data
          </AmIButton>
        </div>

        <!-- US Card -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h2 class="text-xl font-bold text-slate-900">USA Categories</h2>
              <p class="text-sm text-slate-500 mt-1">
                {{ usCategories?.results?.length || 0 }} categories cached
              </p>
            </div>
            <div v-if="usLastUpdated" class="text-xs text-slate-400 text-right">
              Updated:<br />
              {{ usLastUpdated }}
            </div>
          </div>

          <div
            class="h-64 bg-slate-50 rounded-lg border border-slate-200 mb-4 overflow-auto p-3 text-xs font-mono">
            <div v-if="usCategories">
              <div v-for="cat in usCategories.results" :key="cat.tag" class="mb-1">
                <span class="font-bold text-slate-700">{{ cat.label }}</span>
                <span class="text-slate-400"> ({{ cat.tag }})</span>
              </div>
            </div>
            <div v-else class="h-full flex items-center justify-center text-slate-400 italic">
              No data cached
            </div>
          </div>

          <AmIButton
            :loading="loadingUS"
            class="w-full justify-center"
            @click="fetchCategories('us')">
            Fetch & Cache USA Data
          </AmIButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Timestamp } from 'firebase/firestore';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from 'vuefire';

type CategoryResponse = {
  results: { label: string; tag: string }[];
};

const db = useFirestore();

const loadingUK = ref(false);
const loadingUS = ref(false);
const ukCategories = ref<any>(null);
const usCategories = ref<any>(null);
const ukLastUpdated = ref<string>('');
const usLastUpdated = ref<string>('');

const formatDate = (ts: Timestamp | null) => {
  if (!ts) return '';
  return ts.toDate().toLocaleString();
};

const loadFromCache = async () => {
  try {
    const [ukSnap, usSnap] = await Promise.all([
      getDoc(doc(db, 'adzuna_categories', 'gb')),
      getDoc(doc(db, 'adzuna_categories', 'us'))
    ]);

    if (ukSnap.exists()) {
      const data = ukSnap.data();
      ukCategories.value = data.data;
      ukLastUpdated.value = formatDate(data.updatedAt);
    }

    if (usSnap.exists()) {
      const data = usSnap.data();
      usCategories.value = data.data;
      usLastUpdated.value = formatDate(data.updatedAt);
    }
  } catch (e) {
    console.error('Error loading cache:', e);
  }
};

const fetchCategories = async (country: 'gb' | 'us') => {
  const isUK = country === 'gb';
  if (isUK) loadingUK.value = true;
  else loadingUS.value = true;

  try {
    // 1. Fetch from API
    const response = await $fetch('/api/adzuna/categories', {
      params: { country }
    });

    const cleanedResponse = sanitizeAdzunaData({ results: (response as CategoryResponse).results });

    // 2. Save to Firestore
    await setDoc(doc(db, 'adzuna_categories', country), {
      data: cleanedResponse,
      updatedAt: serverTimestamp()
    });

    // 3. Update local state
    if (isUK) {
      ukCategories.value = cleanedResponse;
      ukLastUpdated.value = new Date().toLocaleString();
    } else {
      usCategories.value = cleanedResponse;
      usLastUpdated.value = new Date().toLocaleString();
    }
  } catch (e) {
    console.error(e);
    alert('Failed to fetch categories');
  } finally {
    if (isUK) loadingUK.value = false;
    else loadingUS.value = false;
  }
};

onMounted(() => {
  loadFromCache();
});
</script>
