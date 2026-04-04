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

    <LazyModalAmbiguity
      v-if="showAmbiguityModal"
      :search-term="cleanSearchTitle"
      :country="country"
      :options="ambiguityOptions"
      @close="showAmbiguityModal = false"
      @resolve="onAmbiguityResolved" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, MapPin, Wallet } from 'lucide-vue-next';
import { slugify } from '~/helpers/utility';

const { setLocale, locale, t } = useI18n();
const { trackSearch, trackAmbiguousSearch } = useAnalytics();
const { logSearch } = useUserLogging();
const route = useRoute();

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

const title = ref<string>('');
const location = ref<string>('');
const salary = ref<number>(0);
const period = ref<string>('year');
const loading = ref<boolean>(false);

// --- NEW DICTIONARY & MODAL STATE ---
const { resolveJobId } = useJobDictionary();
const showAmbiguityModal = ref<boolean>(false);
const ambiguityOptions = ref<any[]>([]);
const cleanSearchTitle = ref<string>('');

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

/**
 * 1. Main Search Handler
 */
const handleSearch = async () => {
  loading.value = true;

  // STEP 1: Check dropdown autocomplete ID
  let exactGovId = labelToIdMap.value[title.value];

  // STEP 2: Clean the title
  let cleaned = title.value.replace(/\s*\(.*\)$/, '');

  if (exactGovId) {
    cleaned = cleaned
      .split(',')
      .map((word) => word.trim())
      .reverse()
      .join(' ');
  }

  cleanSearchTitle.value = cleaned;

  // STEP 3: Dictionary Resolution
  if (!exactGovId) {
    const result = await resolveJobId(cleanSearchTitle.value);

    switch (result.type) {
      case 'exact':
        exactGovId = result.id;
        break;

      case 'ambiguous':
        // Multiple matches found OR fuzzy Algolia suggestions available
        // Stop navigation and show the modal
        ambiguityOptions.value = result.options;

        // Auto-select if there is exactly 1 match
        if (result.options && result.options.length === 1 && result.options[0]) {
          await onAmbiguityResolved(result.options[0].id_code);
          return;
        }

        showAmbiguityModal.value = true;
        loading.value = false;
        return;

      case 'unmapped':
      case 'error':
        // Proceed without ID to allow fallback UI on the results page
        break;
    }
  }

  // STEP 4: Navigate
  await executeNavigation(cleanSearchTitle.value, exactGovId);
};

/**
 * 2. THE MODAL CALLBACK
 */
const onAmbiguityResolved = async (resolvedGovId: string) => {
  showAmbiguityModal.value = false;
  loading.value = true;

  const selectedMatch = ambiguityOptions.value.find((opt) => opt.id_code === resolvedGovId);

  if (selectedMatch) {
    // Fire and forget: log the suggestion without awaiting
    $fetch('/api/user/suggestion', {
      method: 'POST',
      body: {
        search_term: cleanSearchTitle.value,
        target_id_code: resolvedGovId,
        target_group_name: selectedMatch.group_name,
        country: country.value
      }
    }).catch((err) => console.error('Failed to save suggestion tracking', err));

    trackAmbiguousSearch(cleanSearchTitle.value, selectedMatch.group_name);
  }

  await executeNavigation(cleanSearchTitle.value, resolvedGovId);
};

/**
 * 3. THE ROUTER (Using /benchmark/ instead of /salary/)
 */
const executeNavigation = async (finalTitle: string, finalGovId?: string) => {
  const titleSlug = slugify(finalTitle);
  const countrySlug = country.value.toLowerCase();
  const locationSlug = location.value ? slugify(location.value) : '';

  // Notice: We keep the /benchmark/ path for the RoleSearch page
  const path = locationSlug
    ? `/benchmark/${titleSlug}/${countrySlug}/${locationSlug}`
    : `/benchmark/${titleSlug}/${countrySlug}`;

  trackSearch(
    finalTitle.trim(),
    country.value,
    location.value,
    String(salary.value),
    schedule.value,
    contract.value
  );

  logSearch(
    finalTitle.trim(),
    country.value,
    location.value,
    String(salary.value),
    schedule.value,
    contract.value
  );

  // Check if we are staying on the same base path
  const isSamePath = route.path === path;

  await navigateTo({
    path,
    query: {
      q: finalTitle.trim(),
      gov_id: finalGovId,
      schedule: schedule.value,
      contract: contract.value,
      compare: salary.value || undefined,
      period: period.value !== 'year' ? period.value : undefined
    },
    state: {
      confirmed: !!finalGovId
    }
  });

  // If we are just updating queries on the same page, turn off the loader so it doesn't spin forever
  if (isSamePath) {
    loading.value = false;
  } else {
    // Navigating to a new page! Leave loading = true so the button keeps spinning.
    // Failsafe timeout in case navigation gets cancelled/fails for any reason:
    setTimeout(() => {
      if (loading.value) loading.value = false;
    }, 5000);
  }
};
</script>
