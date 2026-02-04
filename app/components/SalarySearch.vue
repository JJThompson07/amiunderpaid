<template>
  <div class="relative w-full max-w-5xl mx-auto mt-8">
    <!-- Country Toggles -->
    <div class="flex justify-center mb-6">
      <div
        class="inline-flex p-1 rounded-full bg-slate-900/50 backdrop-blur-md border border-white/10 shadow-lg">
        <button
          v-for="c in ['UK', 'USA']"
          :key="c"
          type="button"
          class="px-6 py-2 text-xs font-bold rounded-full transition-all duration-300"
          :class="
            country === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'
          "
          @click="country = c">
          {{ c }}
        </button>
      </div>
    </div>

    <div class="p-3 bg-white shadow-2xl rounded-3xl ring-1 ring-slate-900/5">
      <form class="flex flex-col gap-3" @submit.prevent="handleSearch">
        <!-- Job Title -->
        <div class="flex-1">
          <AmIAutocompleteInput
            v-model="title"
            label="Job Title"
            placeholder="e.g. Software Engineer"
            :icon="Search"
            :options="titleOptions"
            @update:model-value="fetchTitles" />
        </div>

        <div class="flex flex-col md:flex-row gap-3">
          <!-- Location -->
          <div class="flex-1">
            <AmIInput
              v-model="location"
              label="Location"
              placeholder="e.g. London"
              :icon="MapPin" />
          </div>

          <!-- Salary -->
          <div class="flex-1">
            <AmIInput
              v-model="salary"
              v-model:param-value="period"
              type="number"
              label="Current Salary"
              :placeholder="currencySymbol + '0'"
              :icon="Banknote"
              :params="periodOptions" />
          </div>
        </div>

        <!-- Submit -->
        <div class="mt-4">
          <AmIAnimatedBorder class="rounded-xl" :loading="loading">
            <AmIButton
              type="submit"
              text-colour="text-white"
              class="w-full text-center"
              :loading="loading"
              :disabled="title === '' || salary === ''"
              @click.prevent="handleSearch">
              Check Salary
            </AmIButton>
          </AmIAnimatedBorder>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, MapPin, Banknote } from 'lucide-vue-next';
import { useFirestore } from 'vuefire';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

const db = useFirestore();

const country = ref('UK');
const title = ref('');
const location = ref('');
const salary = ref('');
const period = ref('year');
const loading = ref(false);
const titleOptions = ref<string[]>([]);

const currencySymbol = computed(() => (country.value === 'USA' ? '$' : '£'));

// ** Period Options Logic **
// Restricts options based on selected country
const periodOptions = computed(() => {
  const opts = [{ label: '/ yr', value: 'year' }];
  if (country.value === 'UK') {
    opts.push({ label: '/ hr', value: 'hour' });
    opts.push({ label: '/ wk', value: 'week' });
  }
  return opts;
});

// Reset period to 'year' if switching to USA
watch(country, (newVal) => {
  if (newVal === 'USA') {
    period.value = 'year';
  }
});

const fetchTitles = async (val: string) => {
  if (!val || val.length < 2 || !db) return;

  try {
    const q = query(
      collection(db, 'job_titles'),
      where('country', '==', country.value),
      where('searchTitle', '>=', val.toLowerCase()),
      where('searchTitle', '<=', val.toLowerCase() + '\uf8ff'),
      limit(5)
    );
    const snap = await getDocs(q);
    titleOptions.value = snap.docs.map((d) => d.data().title);
  } catch (e) {
    // Silent fail for autocomplete
    console.error(e);
  }
};

const handleSearch = async () => {
  loading.value = true;
  await navigateTo({
    path: '/results',
    query: {
      title: title.value,
      loc: location.value,
      sal: salary.value,
      country: country.value,
      period: period.value
    }
  });
  loading.value = false;
};
</script>
