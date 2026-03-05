<template>
  <div class="relative w-full max-w-5xl mx-auto mt-8">
    <div class="flex items-center justify-between gap-4 mb-6 w-full">
      <div class="flex gap-4 items-center w-full">
        <div class="flex-1"></div>
        <div
          class="inline-flex p-1 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-white/10 shadow-lg">
          <button
            v-for="c in ['UK', 'USA']"
            :key="c"
            type="button"
            class="px-6 py-2 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer"
            :class="
              country === c
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-300 hover:text-white'
            "
            @click="changeCountry(c)">
            {{ c }}
          </button>
        </div>
        <div class="flex flex-1 justify-end">
          <AmIButton v-if="!showCalc" title="Salary converter" @click="showCalc = true"
            ><CalculatorIcon class="w-5 h-5 text-slate-50"
          /></AmIButton>

          <LazyModalSalaryConverter
            v-if="showCalc"
            :country="country"
            :currency-symbol="currencySymbol"
            @close="showCalc = false" />
        </div>
      </div>
    </div>

    <div class="p-3 bg-white shadow-2xl rounded-3xl ring-1 ring-slate-900/5">
      <form class="flex flex-col gap-3" @submit.prevent="handleSearch">
        <div class="flex-1">
          <AmIAutocompleteInput
            v-model="title"
            :label="$t('search.title.label')"
            :helper="$t('search.title.helper')"
            :placeholder="$t('search.title.placeholder')"
            :icon="Search"
            :options="titleOptions"
            :loading="fetching"
            pre-filtered-options
            @update:model-value="fetchTitles" />
        </div>

        <div class="flex flex-col md:flex-row gap-3">
          <div class="flex-1">
            <AmIAutocompleteInput
              v-model="location"
              :label="
                country === 'USA' ? $t('search.location.label.usa') : $t('search.location.label.uk')
              "
              :placeholder="
                country === 'USA'
                  ? $t('search.location.placeholder.usa')
                  : $t('search.location.placeholder.uk')
              "
              :icon="MapPin"
              :options="locationOptions"
              optional
              pre-filtered-options
              @update:model-value="fetchLocations" />
          </div>

          <div class="flex-1">
            <AmIInput
              v-model="salary"
              v-model:param-value="period"
              type="number"
              :step="10"
              :label="$t('search.salary.label')"
              :placeholder="currencySymbol + '55,000'"
              :icon="Wallet"
              optional
              :params="periodOptions" />
          </div>
        </div>

        <div class="mt-4">
          <AmIAnimatedBorder class="rounded-xl" :loading="loading">
            <AmIButton
              type="submit"
              text-colour="text-white"
              class="w-full text-center"
              :loading="loading"
              :disabled="title === ''"
              :title="$t('buttons.check-salary')"
              @click.prevent="handleSearch">
              {{ $t('buttons.check-salary') }}
            </AmIButton>
          </AmIAnimatedBorder>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, MapPin, CalculatorIcon, Wallet } from 'lucide-vue-next';
import type { SearchClient } from 'algoliasearch';

const props = defineProps<{
  initialCountry?: string;
}>();

const emit = defineEmits(['country-change']);

const url = useRequestURL();
const country = ref(props.initialCountry || (url.hostname.includes('.com') ? 'USA' : 'UK'));

// const userPersonas = ['employer', 'employee'];
// const userPersona = useState('userPersona', () => 'employer');

const title = ref('');
const location = ref('');
const salary = ref('');
const period = ref('year');
const loading = ref(false);
const fetching = ref(false);
const titleOptions = ref<string[]>([]);
const locationOptions = ref<string[]>([]);
const showCalc = ref<boolean>(false);

// Map to temporarily hold the IDs for the selected labels
const labelToIdMap = ref<Record<string, string>>({});

const { trackSearch } = useAnalytics();

const currencySymbol = computed(() => (country.value === 'USA' ? '$' : '£'));

// ** Period Options Logic **
// Restricts options based on selected country
const periodOptions = computed(() => {
  const opts = [{ label: '/ yr', value: 'year' }];
  return opts;
});

// Reset period to 'year' if switching to USA
watch(country, (newVal) => {
  if (newVal === 'USA') {
    period.value = 'year';
  }
  titleOptions.value = [];
});

const changeCountry = (newCountry: string) => {
  country.value = newCountry;
  emit('country-change', newCountry);
};

const fetchUKTitles = async (searchTerm: string) => {
  const { $algolia } = useNuxtApp();
  const index = ($algolia as SearchClient).initIndex('job_titles');

  const { hits } = await index.search(searchTerm, {
    filters: `country:UK`,
    hitsPerPage: 100
  });

  const results = new Set<string>();
  hits.forEach((hit: any) => {
    const cleanGroup = hit.group ? hit.group.replace(/\s*\(.*\)$/, '') : '';
    const label = cleanGroup ? `${hit.title} (${cleanGroup})` : hit.title;

    // Store the SOC code linked to this specific label
    if (hit.soc) {
      labelToIdMap.value[label] = hit.soc;
    }

    results.add(label);
  });

  return Array.from(results);
};

const fetchUSATitles = async (searchTerm: string) => {
  const { $algolia } = useNuxtApp();

  const index = ($algolia as SearchClient).initIndex('regional_salary_benchmarks');

  let filters = `country:USA`;
  if (location.value && locationOptions.value.length > 0) {
    const locVal = location.value.toLowerCase().replace(/"/g, '\\"');
    filters += ` AND searchLocation:"${locVal}"`;
  }

  const { hits } = await index.search(searchTerm, {
    filters,
    hitsPerPage: 20
  });

  const results = new Set<string>();
  hits.forEach((hit: any) => {
    // Store the ID code linked to this specific title
    const id = hit.id_code || hit.objectID;
    if (id) {
      labelToIdMap.value[hit.title] = id;
    }
    results.add(hit.title);
  });
  return Array.from(results);
};

const fetchUKLocations = async (searchTerm: string) => {
  const { $algolia } = useNuxtApp();
  const index = ($algolia as SearchClient).initIndex('regional_salary_benchmarks');

  const { facetHits } = await index.searchForFacetValues('location', searchTerm, {
    filters: `country:UK`,
    maxFacetHits: 20
  });

  return facetHits.map((h: any) => h.value);
};

const fetchUSALocations = async (searchTerm: string) => {
  const { $algolia } = useNuxtApp();
  const index = ($algolia as SearchClient).initIndex('regional_salary_benchmarks');

  let filters = `country:USA`;
  if (title.value && titleOptions.value.length > 0) {
    const titleVal = title.value.toLowerCase().replace(/"/g, '\\"');
    filters += ` AND searchTitle:"${titleVal}"`;
  }

  const { facetHits } = await index.searchForFacetValues('location', searchTerm, {
    filters,
    maxFacetHits: 20
  });

  return facetHits.map((h: any) => h.value);
};

const fetchTitles = useDebounceFn(async (val: string) => {
  if (!val || val.length < 2) {
    titleOptions.value = [];
    return;
  }

  fetching.value = true;
  const searchTerm = val.trim();

  try {
    if (country.value === 'UK') {
      titleOptions.value = await fetchUKTitles(searchTerm);
    } else {
      titleOptions.value = await fetchUSATitles(searchTerm);
    }
  } catch {
    // Silent fail for autocomplete
  } finally {
    fetching.value = false;
  }
}, 300);

const fetchLocations = useDebounceFn(async (val: string) => {
  if (!val || val.length < 2) {
    locationOptions.value = [];
    return;
  }

  fetching.value = true;

  try {
    if (country.value === 'UK') {
      locationOptions.value = await fetchUKLocations(val);
    } else {
      locationOptions.value = await fetchUSALocations(val);
    }
  } catch {
    // Silent fail for autocomplete
  } finally {
    fetching.value = false;
  }
}, 300);

const handleSearch = async () => {
  loading.value = true;

  // 1. Get exact ID if they picked an option from the autocomplete dropdown
  const exactGovId = labelToIdMap.value[title.value];

  // 2. Remove parent group in parentheses to give Adzuna a clean job title
  const cleanTitle = title.value.replace(/\s*\(.*\)$/, '');

  const slugify = (str: string) => {
    const cleanStr = str.replace(/,/g, '');
    return cleanStr.toLowerCase().trim().replace(/\s+/g, '-').replace(/-+/g, '-');
  };

  const titleSlug = slugify(cleanTitle);
  const countrySlug = country.value.toLowerCase();
  const locationSlug = location.value ? slugify(location.value) : '';

  const path = locationSlug
    ? `/benchmark/${titleSlug}/${countrySlug}/${locationSlug}`
    : `/benchmark/${titleSlug}/${countrySlug}`;

  trackSearch(cleanTitle.trim(), country.value, location.value, salary.value);

  await navigateTo({
    path,
    query: {
      q: cleanTitle.trim(),
      gov_id: exactGovId, // Send exact DB ID for 100% accurate Government matching
      compare: salary.value || undefined,
      // persona: userPersona.value,
      period: period.value !== 'year' ? period.value : undefined
    },
    state: {
      confirmed: !!exactGovId
    }
  });
  loading.value = false;
};
</script>
