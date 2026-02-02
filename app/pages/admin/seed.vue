<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-100 p-4">
    <div
      class="p-8 bg-white rounded-xl shadow-lg text-center max-w-lg w-full border border-slate-200">
      <div class="mb-6 flex justify-center">
        <div
          class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-primary-600 shadow-inner">
          <Database class="w-8 h-8" />
        </div>
      </div>

      <h1 class="text-2xl font-bold mb-2 text-slate-900">Database Seeder</h1>
      <p class="text-slate-500 mb-8 text-sm">
        Ready to populate
        <span
          class="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
          >salary_benchmarks</span
        >
        with <span class="font-bold text-slate-900">{{ ukSalaries.length }}</span> records.
      </p>

      <!-- Status Console -->
      <div
        v-if="status"
        class="mb-6 bg-slate-900 rounded-lg text-left overflow-hidden shadow-inner">
        <div
          class="px-4 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
          <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider"
            >Console Log</span
          >
          <div class="flex gap-1.5">
            <div class="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          </div>
        </div>
        <div
          class="p-4 overflow-y-auto max-h-48 font-mono text-xs text-emerald-400 whitespace-pre-wrap leading-relaxed">
          {{ status }}
        </div>
      </div>

      <AmIAnimatedBorder :loading="loading" active-bg-colour="bg-slate-400">
        <AmIButton :loading="loading" block class="w-full" @click="seedDatabase">
          <div class="flex items-center justify-center gap-2">
            <span>{{ loading ? 'Seeding Database...' : 'Run Seed Script' }}</span>
            <UploadCloud v-if="!loading" class="w-4 h-4" />
          </div>
        </AmIButton>
      </AmIAnimatedBorder>
    </div>
  </div>
</template>

<script setup lang="ts">
// ** imports **
import { ref } from 'vue';
import { Database, UploadCloud } from 'lucide-vue-next';
import { useFirestore } from 'vuefire';
import { writeBatch, doc } from 'firebase/firestore';
import { ukSalaries } from '../../../utils/seedData';

// ** type definitions **

// ** props **

// ** emits **

// ** data & refs **
const db = useFirestore();
const loading = ref(false);
const status = ref('');

// ** computed properties **

// ** methods **
const seedDatabase = async () => {
  if (loading.value) return;

  loading.value = true;
  status.value = '> Initializing batch write...\n';

  try {
    // Check if database connection is valid
    if (!db) {
      throw new Error('Firestore instance not found. Check your .env config.');
    }

    const batch = writeBatch(db);
    let count = 0;

    status.value += '> Processing records...\n';

    for (const record of ukSalaries) {
      // Create a deterministic ID: "UK-London-Software_Engineer-2025"
      // This prevents duplicates. If we run this script again, it just overwrites the existing doc.
      const docId = `${record.country}-${record.location}-${record.title}-${record.year}`
        .replace(/\s+/g, '_')
        .toLowerCase();

      const docRef = doc(db, 'salary_benchmarks', docId);

      batch.set(docRef, {
        ...record,
        searchTitle: record.title.toLowerCase(), // Helper for searching
        searchLocation: record.location.toLowerCase(), // Helper for searching
        updatedAt: new Date(),
      });

      count++;
    }

    status.value += `> Prepared ${count} documents for upload.\n`;
    status.value += `> Committing to Firestore (this may take a moment)...\n`;

    // Add a race condition to timeout if it hangs (e.g. bad permissions)
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out. Check Firestore Rules.')), 10000)
    );

    await Promise.race([batch.commit(), timeout]);

    status.value += `\n✅ SUCCESS: Successfully wrote ${count} records to database.`;
  } catch (e: unknown) {
    console.error(e);
    status.value += `\n❌ ERROR: ${e.message}`;

    if (e.message.includes('permission')) {
      status.value += `\n\nTIP: Go to Firebase Console -> Build -> Firestore -> Rules and ensure reads/writes are allowed (Test Mode).`;
    }
  } finally {
    loading.value = false;
  }
};

// ** watchers **
</script>
