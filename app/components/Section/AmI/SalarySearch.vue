<template>
  <div class="relative w-full max-w-5xl mx-auto mt-8">
    <div class="flex justify-between items-center gap-4 mb-6">
      <div class="flex-1"></div>
      <a
        :href="alternateSiteUrl"
        target="_self"
        class="relative cursor-pointer decoration-0 px-4 py-2 flex flex-row gap-1 items-center text-xs bg-primary-500 text-white hover:bg-primary-400 rounded-lg overflow-hidden transition-all duration-700 ease-in-out font-bold">
        {{ $t('search.ami.switch-site') }}
        <ArrowRightIcon class="w-4 h-4" />
      </a>
      <div class="flex flex-1 justify-end">
        <AmIButton v-if="!showCalc" title="Salary converter" @click="showCalc = true"
          ><CalculatorIcon class="w-5 h-5 text-slate-50"
        /></AmIButton>

        <LazyModalSalaryConverter
          v-if="showCalc"
          :country="currentCountry"
          :currency-symbol="currencySymbol"
          @close="showCalc = false" />
      </div>
    </div>

    <div class="p-3 bg-white shadow-2xl rounded-3xl ring-1 ring-slate-900/5">
      <form class="flex flex-col gap-3" @submit.prevent="handleSearch">
        <div class="flex-1">
          <AmIInputAutocomplete
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
              :label="$t('search.location.label')"
              :placeholder="$t('search.location.placeholder')"
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
              :label="$t('search.salary.label')"
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
      :country="currentCountry"
      :options="ambiguityOptions"
      @close="showAmbiguityModal = false"
      @resolve="onAmbiguityResolved" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, MapPin, CalculatorIcon, Wallet, ArrowRightIcon } from 'lucide-vue-next';
import { slugify } from '~/helpers/utility';

const { t } = useI18n();
const { trackSearch } = useAnalytics();
const { logSearch } = useUserLogging();
const { currentCountry, alternateSiteUrl } = useRegion();

const scheduleOptions = [
  { label: t('search.time.full-time'), value: 'full-time' },
  { label: t('search.time.part-time'), value: 'part-time' },
  { label: t('common.all'), value: 'all' }
];

const contractOptions = [
  { label: t('search.contract.permanent'), value: 'permanent' },
  { label: t('search.contract.contract'), value: 'contract' },
  { label: t('common.all'), value: 'all' }
];

const schedule = ref('full-time');
const contract = ref('permanent');

const title = ref<string>('');
const location = ref<string>('');
const salary = ref<number>(0);
const period = ref<string>('year');
const loading = ref<boolean>(false);
const showCalc = ref<boolean>(false);

// --- NEW DICTIONARY & MODAL STATE ---
const { resolveJobId } = useJobDictionary();
const showAmbiguityModal = ref<boolean>(false);
const ambiguityOptions = ref<any[]>([]);
const cleanSearchTitle = ref<string>('');

const { fetching, titleOptions, locationOptions, labelToIdMap, fetchTitles, fetchLocations } =
  useJobAutocomplete(currentCountry, location, title);

const currencySymbol = computed(() => (currentCountry.value === 'USA' ? '$' : '£'));

const periodOptions = computed(() => {
  const opts = [{ label: '/ yr', value: 'year' }];
  return opts;
});

/**
 * Main Search Handler
 * 1. Resolves the Job Title to a Government SOC Code
 * 2. Cleans the title for third-party API (Adzuna) compatibility
 * 3. Navigates or shows Ambiguity Modal if needed
 */
const handleSearch = async () => {
  loading.value = true;

  // STEP 1: Check if the user picked a specific result from the Autocomplete dropdown
  // labelToIdMap maps the "Job Title (Group)" string to the SOC ID
  let exactGovId = labelToIdMap.value[title.value];

  // STEP 2: Clean the title for search
  // Remove any parenthetical groups (e.g., "Developer (Programmers)" -> "Developer")
  let cleaned = title.value.replace(/\s*\(.*\)$/, '');

  // If the title came from an official government list, it's often "Lastname, Firstname"
  // We reverse this so Adzuna/Job boards can search it naturally
  if (exactGovId) {
    cleaned = cleaned
      .split(',')
      .map((word) => word.trim())
      .reverse()
      .join(' ');
  }

  // Store this for the Ambiguity Modal and Analytics
  cleanSearchTitle.value = cleaned;

  // STEP 3: Dictionary Resolution (Only if they didn't pick an autocomplete item)
  if (!exactGovId) {
    // resolveJobId handles Firestore exact matches and Algolia fuzzy fallbacks
    const result = await resolveJobId(cleanSearchTitle.value);

    switch (result.type) {
      case 'exact':
        // A hand-curated synonym was found 1:1 in Firestore
        exactGovId = result.id;
        break;

      case 'ambiguous':
        // Multiple matches found OR fuzzy Algolia suggestions available
        // Stop navigation and show the modal
        ambiguityOptions.value = result.options;
        showAmbiguityModal.value = true;
        loading.value = false;
        return;

      case 'unmapped':
      case 'error':
        // No match found; we proceed with exactGovId as null
        // This lets the results page try a raw keyword search
        break;
    }
  }

  // STEP 4: Final Execution
  // If we reach here, we either have an ID or are searching by raw title
  executeNavigation(cleanSearchTitle.value, exactGovId);
};

// ==========================================
// 2. THE MODAL CALLBACK
// ==========================================
// When the user clicks an option in the Modal, it emits the resolved SOC Code
const onAmbiguityResolved = (resolvedGovId: string) => {
  showAmbiguityModal.value = false;
  loading.value = true; // Turn button loader back on

  const selectedMatch = ambiguityOptions.value.find((opt) => opt.id_code === resolvedGovId);

  if (selectedMatch) {
    // Fire and forget: log the suggestion without awaiting
    $fetch('/api/user/suggestion', {
      method: 'POST',
      body: {
        search_term: cleanSearchTitle.value,
        target_id_code: resolvedGovId,
        target_group_name: selectedMatch.group_name,
        country: currentCountry.value
      }
    }).catch((err) => console.error('Failed to save suggestion tracking', err));
  }

  executeNavigation(cleanSearchTitle.value, resolvedGovId);
};

// ==========================================
// 3. THE ROUTER
// ==========================================
const executeNavigation = async (finalTitle: string, finalGovId?: string) => {
  const titleSlug = slugify(finalTitle);
  const countrySlug = currentCountry.value.toLowerCase();
  const locationSlug = location.value ? slugify(location.value) : '';

  const path = locationSlug
    ? `/salary/${titleSlug}/${countrySlug}/${locationSlug}`
    : `/salary/${titleSlug}/${countrySlug}`;

  trackSearch(
    finalTitle.trim(),
    currentCountry.value,
    location.value,
    String(salary.value),
    schedule.value,
    contract.value
  );

  logSearch(
    finalTitle.trim(),
    currentCountry.value,
    location.value,
    String(salary.value),
    schedule.value,
    contract.value
  );

  await navigateTo({
    path,
    query: {
      q: finalTitle.trim(),
      gov_id: finalGovId, // Send exact DB ID for 100% accurate Government matching
      schedule: schedule.value,
      contract: contract.value,
      compare: salary.value || undefined,
      period: period.value !== 'year' ? period.value : undefined
    },
    state: {
      confirmed: !!finalGovId
    }
  });

  loading.value = false;
};
</script>
