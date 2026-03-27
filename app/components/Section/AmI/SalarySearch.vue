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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, MapPin, CalculatorIcon, Wallet, ArrowRightIcon } from 'lucide-vue-next';
import { useSearchAutocomplete } from '~/composables/useSearchAutocomplete';

const { t } = useI18n();

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

const { currentCountry, alternateSiteUrl } = useRegion();

const schedule = ref('full-time');
const contract = ref('permanent');

const title = ref('');
const location = ref('');
const salary = ref('');
const period = ref('year');
const loading = ref(false);
const showCalc = ref<boolean>(false);

const { trackSearch } = useAnalytics();

const { fetching, titleOptions, locationOptions, labelToIdMap, fetchTitles, fetchLocations } =
  useSearchAutocomplete(currentCountry, location, title);

const currencySymbol = computed(() => (currentCountry.value === 'USA' ? '$' : '£'));

// ** Period Options Logic **
// Restricts options based on selected country
const periodOptions = computed(() => {
  const opts = [{ label: '/ yr', value: 'year' }];
  return opts;
});

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

  const slugify = (str: string) => {
    const cleanStr = str.replace(/,/g, '');
    return cleanStr.toLowerCase().trim().replace(/\s+/g, '-').replace(/-+/g, '-');
  };

  const titleSlug = slugify(cleanTitle);
  const countrySlug = currentCountry.value.toLowerCase();
  const locationSlug = location.value ? slugify(location.value) : '';

  const path = locationSlug
    ? `/salary/${titleSlug}/${countrySlug}/${locationSlug}`
    : `/salary/${titleSlug}/${countrySlug}`;

  trackSearch(cleanTitle.trim(), currentCountry.value, location.value, salary.value);

  await navigateTo({
    path,
    query: {
      q: cleanTitle.trim(),
      gov_id: exactGovId, // Send exact DB ID for 100% accurate Government matching
      schedule: schedule.value,
      contract: contract.value,
      compare: salary.value || undefined,
      period: period.value !== 'year' ? period.value : undefined
    },
    state: {
      confirmed: !!exactGovId
    }
  });
  loading.value = false;
};
</script>
