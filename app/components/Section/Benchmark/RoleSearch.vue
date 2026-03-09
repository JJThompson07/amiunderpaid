<template>
  <div class="relative w-full max-w-5xl mx-auto mt-8">
    <div class="flex items-center justify-between gap-4 mb-6 w-full">
      <div class="flex gap-4 items-center w-full">
        <div class="flex-1"></div>
        <AmITabs
          v-model="country"
          :options="countryOptions"
          round
          @update:model-value="emit('country-change', country)" />
        <div class="flex flex-1"></div>
      </div>
    </div>

    <div class="p-3 bg-white shadow-2xl rounded-3xl ring-1 ring-slate-900/5">
      <form class="flex flex-col gap-3" @submit.prevent="handleSearch">
        <div class="flex-1">
          <AmIAutocompleteInput
            v-model="title"
            :label="$t('search.benchmark.title.label')"
            :helper="$t('search.benchmark.title.helper')"
            :placeholder="$t('search.benchmark.title.placeholder')"
            :icon="Search"
            :options="titleOptions"
            :loading="fetching"
            pre-filtered-options
            @update:model-value="fetchTitles" />
        </div>

        <div class="flex flex-col md:flex-row gap-3">
          <AmITabs
            v-model="schedule"
            class="flex-1"
            :label="$t('search.time.label')"
            :options="scheduleOptions"
            bg-colour="bg-slate-200"
            text-colour="text-slate-500"
            hover-colour="hover:text-primary-400"
            button-colour="bg-primary-500"
            button-text-colour="text-white" />
          <AmITabs
            v-model="contract"
            class="flex-1"
            :label="$t('search.contract.label')"
            :options="contractOptions"
            bg-colour="bg-slate-200"
            text-colour="text-slate-500"
            hover-colour="hover:text-primary-400"
            button-colour="bg-primary-500"
            button-text-colour="text-white" />
        </div>

        <div class="flex flex-col md:flex-row gap-3">
          <div class="flex-1">
            <AmIAutocompleteInput
              v-model="location"
              :label="
                country === 'USA'
                  ? $t('search.benchmark.location.label.usa')
                  : $t('search.benchmark.location.label.uk')
              "
              :placeholder="
                country === 'USA'
                  ? $t('search.benchmark.location.placeholder.usa')
                  : $t('search.benchmark.location.placeholder.uk')
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
              :label="$t('search.benchmark.salary.label')"
              :placeholder="currencySymbol + '55,000'"
              :prefix="currencySymbol"
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
import { Search, MapPin, Wallet } from 'lucide-vue-next';
import type { SearchClient } from 'algoliasearch';

const props = defineProps<{
  initialCountry?: string;
}>();

const emit = defineEmits(['country-change']);

const { t } = useI18n();

const countryOptions = [
  { label: 'UK', value: 'UK' },
  { label: 'USA', value: 'USA' }
];

const url = useRequestURL();
const country = ref(props.initialCountry || (url.hostname.includes('.com') ? 'USA' : 'UK'));
const schedule = ref('full-time');
const contract = ref('permanent');

const scheduleOptions = [
  { label: t('search.time.full-time'), value: 'full-time' },
  { label: t('search.time.part-time'), value: 'part-time' },
  { label: t('common.all'), value: 'all' }
];

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

// Map to temporarily hold the IDs for the selected labels
const labelToIdMap = ref<Record<string, string>>({});

const { trackSearch } = useAnalytics();

const contractOptions = computed(() => [
  {
    label: t(`search.benchmark.contract.${country.value.toLowerCase()}.permanent`),
    value: 'permanent'
  },
  {
    label: t(`search.benchmark.contract.${country.value.toLowerCase()}.contract`),
    value: 'contract'
  },
  { label: t('common.all'), value: 'all' }
]);

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
      schedule: schedule.value,
      contract: contract.value,
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
