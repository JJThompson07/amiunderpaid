<template>
  <div class="relative z-20 w-full max-w-4xl mx-auto">
    <!-- Main Card -->
    <div
      class="relative overflow-hidden bg-white border shadow-xl rounded-2xl shadow-indigo-900/10 border-slate-200">
      <div class="p-6 md:p-8">
        <!-- Country Toggle -->
        <div class="flex justify-end mb-4">
          <div class="inline-flex p-1 bg-slate-100 rounded-lg">
            <button
              v-for="c in ['UK', 'USA']"
              :key="c"
              class="px-3 py-1 text-xs font-bold rounded-md transition-all"
              :class="
                country === c
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              "
              @click="country = c">
              {{ c }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6">
          <!-- Job Title Input with Autocomplete -->
          <AmIAutocompleteInput
            v-model="jobTitle"
            :options="currentJobOptions"
            label="Job Title"
            placeholder="e.g. Product Manager"
            :icon="Briefcase" />

          <div class="flex flex-col w-full gap-4 md:flex-row md:items-end">
            <!-- Location Input -->
            <AmIInput
              v-model="location"
              class="flex-1"
              label="Location (City)"
              :placeholder="country === 'UK' ? 'e.g. London' : 'e.g. New York'"
              :icon="MapPin" />

            <!-- Salary Input with timeframe selector -->
            <AmIInput
              v-model="salary"
              class="flex-1"
              label="Current Salary (optional)"
              :placeholder="country === 'UK' ? 'e.g. 45,000' : 'e.g. 80,000'"
              :icon="Briefcase"
              :param-value="period"
              :params="timeframes"
              @update:param-value="($event) => (period = $event)" />

            <!-- Action Button -->
            <div class="md:pb-0">
              <AmIButton block class="md:w-auto md:min-w-[120px]" @click="handleSearch">
                <div class="flex items-center gap-1">
                  <span>Check</span>
                  <ArrowRight class="w-4 h-4" />
                </div>
              </AmIButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer / Disclaimer -->
      <div
        class="flex items-center justify-between px-6 py-3 text-xs border-t bg-slate-50 border-slate-100 text-slate-400">
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Live data from 142,000+ job listings
        </div>
        <span>Last updated: Feb 2026</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ** imports **
import { ref, onMounted, computed } from 'vue';
import { MapPin, ArrowRight, Briefcase } from 'lucide-vue-next';
import { useFirestore } from 'vuefire';
import { collection, addDoc, serverTimestamp, getDocs, query } from 'firebase/firestore';

// ** type definitions **
export type SelectOption = {
  label: string;
  value: string;
};

interface BenchmarkMeta {
  title: string;
  country: string;
}

// ** props **

// ** emits **

// ** data & refs **
const jobTitle = ref('');
const location = ref('');
const salary = ref('');
const period = ref('year');
const country = ref('UK');
const isSaving = ref(false);
const rawBenchmarks = ref<BenchmarkMeta[]>([]); // Stores all raw title+country pairs

const db = useFirestore();

const timeframes: SelectOption[] = [
  { label: '/yr', value: 'year' },
  { label: '/mo', value: 'month' },
  { label: '/day', value: 'day' },
  { label: '/hr', value: 'hour' },
];

// ** computed properties **
// Dynamically filter options based on the currently selected country
const currentJobOptions = computed(() => {
  const filtered = rawBenchmarks.value.filter((b) => b.country === country.value);
  const titles = new Set(filtered.map((b) => b.title));
  return Array.from(titles).sort();
});

// ** methods **
// Function to fetch unique titles from Firestore on load
const fetchJobTitles = async () => {
  if (!db) return;

  try {
    const q = query(collection(db, 'salary_benchmarks'));
    const snapshot = await getDocs(q);

    const results: BenchmarkMeta[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.title && data.country) {
        results.push({ title: data.title, country: data.country });
      }
    });

    rawBenchmarks.value = results;
  } catch (e) {
    console.error('Error fetching job titles for autocomplete:', e);
  }
};

const handleSearch = async () => {
  if (!jobTitle.value) return;

  isSaving.value = true;

  // Fire and forget save
  if (db) {
    addDoc(collection(db, 'searches'), {
      title: jobTitle.value,
      location: location.value,
      country: country.value,
      salary: salary.value ? Number(salary.value.replace(/[^0-9.]/g, '')) : null,
      period: period.value,
      timestamp: serverTimestamp(),
    }).catch((e) => console.error(e));
  }

  // Animation delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Navigate to results
  await navigateTo({
    path: '/results',
    query: {
      title: jobTitle.value,
      loc: location.value,
      country: country.value,
      sal: salary.value.replace(/[^0-9.]/g, ''),
      period: period.value,
    },
  });

  isSaving.value = false;
};

// ** lifecycle **
onMounted(() => {
  fetchJobTitles();
});

// ** watchers **
</script>
