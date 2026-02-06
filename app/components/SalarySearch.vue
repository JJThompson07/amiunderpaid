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
            :loading="fetching"
            @update:model-value="fetchTitles" />
        </div>

        <div class="flex flex-col md:flex-row gap-3">
          <!-- Location -->
          <div class="flex-1">
            <AmIAutocompleteInput
              v-model="location"
              label="Location"
              placeholder="e.g. London"
              :icon="MapPin"
              :options="locationOptions"
              @update:model-value="fetchLocations" />
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
              :disabled="title === ''"
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

const country = ref('UK');
const title = ref('');
const location = ref('');
const salary = ref('');
const period = ref('year');
const loading = ref(false);
const fetching = ref(false);
const titleOptions = ref<string[]>([]);
const locationOptions = ref<string[]>([]);

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
  titleOptions.value = [];
});

const fetchTitles = async (val: string) => {
  if (!val || val.length < 2) {
    titleOptions.value = [];
    return;
  }

  fetching.value = true;
  const searchTerm = val.trim();

  const targetCollection = country.value === 'USA' ? 'salary_benchmarks' : 'job_titles';

  try {
    const { $algolia } = useNuxtApp();
    const index = $algolia.initIndex(targetCollection);

    const { hits } = await index.search(searchTerm, {
      filters: `country:${country.value}`,
      hitsPerPage: 20
    });

    // Deduplicate and format
    const results = new Set<string>();
    
    hits.forEach((hit: any) => {
      const label = hit.group ? `${hit.title} (${hit.group})` : hit.title;
      results.add(label);
    });

    titleOptions.value = Array.from(results);
  } catch (e) {
    console.error(e);
  } finally {
    fetching.value = false;
  }
};

const fetchLocations = async (val: string) => {
  if (!val || val.length < 2) {
    titleOptions.value = [];
    return;
  }

  fetching.value = true;

  try {
    const { $algolia } = useNuxtApp();
    const index = $algolia.initIndex('regional_salary_benchmarks');

    const { hits } = await index.search(val, {
      filters: `country:${country.value}`,
      hitsPerPage: 20
    });

    locationOptions.value = hits.map((h: any) => h.location);
  } catch (e) {
    // Silent fail for autocomplete
    console.error(e);
  } finally {
    fetching.value = false;
  }
};

const handleSearch = async () => {
  loading.value = true;

  const slugify = (str: string) => {
    // 1. Remove parent group in parentheses at the end of the string
    let cleanStr = str.replace(/\s*\(.*\)$/, '');
    // 2. Remove commas
    cleanStr = cleanStr.replace(/,/g, '');
    // 3. Lowercase, trim, and replace spaces/multiple dashes with a single dash
    return cleanStr.toLowerCase().trim().replace(/\s+/g, '-').replace(/-+/g, '-');
  };

  const titleSlug = slugify(title.value);
  const countrySlug = country.value.toLowerCase();
  const locationSlug = location.value ? slugify(location.value) : '';

  const path = locationSlug
    ? `/salary/${titleSlug}/${countrySlug}/${locationSlug}`
    : `/salary/${titleSlug}/${countrySlug}`;

  await navigateTo({
    path,
    state: {
      q: title.value, // Pass original title for accurate lookup
      compare: salary.value || undefined,
      period: period.value !== 'year' ? period.value : undefined
    }
  });
  loading.value = false;
};
</script>
