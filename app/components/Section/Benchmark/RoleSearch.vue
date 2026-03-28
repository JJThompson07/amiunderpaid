<template>
  <div class="relative w-full max-w-5xl mx-auto mt-8">
    <div class="flex items-center justify-between gap-4 mb-6 w-full">
      <div class="flex gap-4 items-center w-full">
        <div class="flex-1"></div>
        <AmITabs
          v-model="country"
          :options="countryOptions"
          round
          @update:model-value="switchLocale" />
        <div class="flex flex-1"></div>
      </div>
    </div>

    <div class="p-3 bg-white shadow-2xl rounded-3xl ring-1 ring-slate-900/5">
      <form class="flex flex-col gap-3" @submit.prevent="handleSearch">
        <div class="flex-1">
          <AmIInputAutocomplete
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
            <AmIInputAutocomplete
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
            <AmIInputGeneric
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
import { slugify } from '~/helpers/utility';

const { setLocale, locale, t } = useI18n();
const { trackSearch } = useAnalytics();
const { logSearch } = useUserLogging();

const props = defineProps<{
  initialCountry?: string;
}>();

const emit = defineEmits(['country-change']);

const countryOptions = [
  { label: 'UK', value: 'UK' },
  { label: 'USA', value: 'USA' }
];

const country = ref(props.initialCountry || 'USA');

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

// Consume our new Composable to handle Algolia fetching
const { fetching, titleOptions, locationOptions, labelToIdMap, fetchTitles, fetchLocations } =
  useJobAutocomplete(country, location, title);

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

watch(
  locale,
  (newLocale) => {
    const expectedCountry = newLocale === 'en-GB' ? 'UK' : 'USA';

    // Only update if they are out of sync, preventing unnecessary re-renders
    if (country.value !== expectedCountry) {
      country.value = expectedCountry;
    }
  },
  { immediate: true }
);

const switchLocale = () => {
  setLocale(country.value === 'USA' ? 'en-US' : 'en-GB');
  emit('country-change', country.value);
};

const handleSearch = async () => {
  loading.value = true;

  // 1. Get exact ID if they picked an option from the autocomplete dropdown
  const exactGovId = labelToIdMap.value[title.value];

  // 2. Remove parent group in parentheses to give Adzuna a clean job title
  let cleanTitle = title.value.replace(/\s*\(.*\)$/, '');

  // if the government title is being used we want to change this order as the government uses a bad order for searching
  if (exactGovId) {
    cleanTitle = cleanTitle
      .split(',')
      .map((word) => word.trim())
      .reverse()
      .join(' ');
  }

  // Uses the fixed global slugify!
  const titleSlug = slugify(cleanTitle);
  const countrySlug = country.value.toLowerCase();
  const locationSlug = location.value ? slugify(location.value) : '';

  const path = locationSlug
    ? `/benchmark/${titleSlug}/${countrySlug}/${locationSlug}`
    : `/benchmark/${titleSlug}/${countrySlug}`;

  trackSearch(
    cleanTitle.trim(),
    country.value,
    location.value,
    salary.value,
    schedule.value,
    contract.value
  );

  logSearch(
    cleanTitle.trim(),
    country.value,
    location.value,
    salary.value,
    schedule.value,
    contract.value
  );

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
