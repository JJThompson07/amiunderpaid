<template>
  <div class="relative w-full max-w-5xl mx-auto mt-8">
    <div v-if="mode === 'benchmark'" class="flex items-center justify-between gap-4 mb-6 w-full">
      <div class="flex gap-4 items-center w-full">
        <div class="flex-1" />
        <AmITabs
          v-model="internalCountry"
          :options="countryOptions"
          round
          @update:model-value="switchLocale" />
        <div class="flex flex-1" />
      </div>
    </div>

    <div
      class="p-3 bg-white/90 backdrop-blur-2xl shadow-2xl rounded-3xl ring-1 ring-slate-900/5 border border-white/60">
      <form class="flex flex-col gap-3" @submit.prevent="handleSearch">
        <div class="flex-1">
          <AmIInputAutocomplete
            v-model="title"
            :label="titleLabel"
            :helper="titleHelper"
            :placeholder="titlePlaceholder"
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
              :label="locationLabel"
              :placeholder="locationPlaceholder"
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
              :label="salaryLabel"
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

    <div v-if="mode === 'salary'" class="flex justify-between items-center px-4 py-3 mt-1">
      <a
        :href="alternateSiteUrl"
        class="text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors flex items-center gap-1 group">
        {{ $t('search.ami.switch-site') }}
        <ArrowRightIcon class="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </a>

      <button
        type="button"
        class="text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors flex items-center gap-1.5"
        @click="showCalc = true">
        <CalculatorIcon class="w-4 h-4" />
        Salary Converter
      </button>

      <LazyModalSalaryConverter
        v-if="showCalc"
        :country="currentCountry"
        :currency-symbol="currencySymbol"
        @close="showCalc = false" />
    </div>

    <LazyModalAmbiguity
      v-if="showAmbiguityModal"
      :search-term="cleanSearchTitle"
      :country="mode === 'benchmark' ? internalCountry : currentCountry"
      :options="ambiguityOptions"
      @close="showAmbiguityModal = false"
      @resolve="onAmbiguityResolved" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ArrowRightIcon, CalculatorIcon, MapPin, Search, Wallet } from 'lucide-vue-next';
import { slugify } from '~/helpers/utility';
import type { JobMatchAmbiguous } from '~/composables/useJobDictionary';

const props = defineProps<{
  mode: 'salary' | 'benchmark';
  initialCountry?: string; // Only used in benchmark mode
}>();

const emit = defineEmits<{
  (e: 'countryChange', country: string): void;
}>();

const { setLocale, locale, t } = useI18n();
const { trackSearch, trackAmbiguousSearch } = useAnalytics();
const { logSearch } = useUserLogging();
const { currentCountry, alternateSiteUrl } = useRegion();
const route = useRoute();

const internalCountry = ref(
  props.mode === 'benchmark' ? props.initialCountry || 'USA' : currentCountry.value
);

const scheduleOptions = [
  { label: t('search.time.full-time'), value: 'full-time' },
  { label: t('search.time.part-time'), value: 'part-time' },
  { label: t('common.all'), value: 'all' }
];

const countryOptions = [
  { label: 'UK', value: 'UK' },
  { label: 'USA', value: 'USA' }
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
const ambiguityOptions = ref<JobMatchAmbiguous['options']>([]);
const cleanSearchTitle = ref<string>('');

const activeCountry = computed(() =>
  props.mode === 'benchmark' ? internalCountry.value : currentCountry.value
);

const { fetching, titleOptions, locationOptions, labelToIdMap, fetchTitles, fetchLocations } =
  useJobAutocomplete(activeCountry, location, title);

const contractOptions = computed(() => {
  if (props.mode === 'benchmark') {
    return [
      {
        label: t(`search.benchmark.contract.${internalCountry.value.toLowerCase()}.permanent`),
        value: 'permanent'
      },
      {
        label: t(`search.benchmark.contract.${internalCountry.value.toLowerCase()}.contract`),
        value: 'contract'
      },
      { label: t('common.all'), value: 'all' }
    ];
  }
  return [
    { label: t('search.contract.permanent'), value: 'permanent' },
    { label: t('search.contract.contract'), value: 'contract' },
    { label: t('common.all'), value: 'all' }
  ];
});

const currencySymbol = computed(() => (activeCountry.value === 'USA' ? '$' : '£'));

const periodOptions = computed(() => {
  return [{ label: '/ yr', value: 'year' }];
});

const titleLabel = computed(() =>
  props.mode === 'benchmark' ? t('search.benchmark.title.label') : t('search.title.label')
);
const titleHelper = computed(() =>
  props.mode === 'benchmark' ? t('search.benchmark.title.helper') : t('search.title.helper')
);
const titlePlaceholder = computed(() =>
  props.mode === 'benchmark'
    ? t('search.benchmark.title.placeholder')
    : t('search.title.placeholder')
);

const locationLabel = computed(() => {
  if (props.mode === 'benchmark') {
    return internalCountry.value === 'USA'
      ? t('search.benchmark.location.label.usa')
      : t('search.benchmark.location.label.uk');
  }
  return t('search.location.label');
});

const locationPlaceholder = computed(() => {
  if (props.mode === 'benchmark') {
    return internalCountry.value === 'USA'
      ? t('search.benchmark.location.placeholder.usa')
      : t('search.benchmark.location.placeholder.uk');
  }
  return t('search.location.placeholder');
});

const salaryLabel = computed(() =>
  props.mode === 'benchmark' ? t('search.benchmark.salary.label') : t('search.salary.label')
);

if (props.mode === 'benchmark') {
  watch(internalCountry, (newVal) => {
    if (newVal === 'USA') {
      period.value = 'year';
    }
    titleOptions.value = [];
  });

  watch(
    locale,
    (newLocale) => {
      const expectedCountry = newLocale === 'en-GB' ? 'UK' : 'USA';
      if (internalCountry.value !== expectedCountry) {
        internalCountry.value = expectedCountry;
      }
    },
    { immediate: true }
  );
}

const switchLocale = (): void => {
  if (props.mode === 'benchmark') {
    setLocale(internalCountry.value === 'USA' ? 'en-US' : 'en-GB');
    emit('countryChange', internalCountry.value);
  }
};

const handleSearch = async (): Promise<void> => {
  loading.value = true;
  let exactGovId = labelToIdMap.value[title.value];
  let cleaned = title.value.replace(/\s*\(.*\)$/, '');

  if (exactGovId) {
    cleaned = cleaned
      .split(',')
      .map((word) => word.trim())
      .reverse()
      .join(' ');
  }

  cleanSearchTitle.value = cleaned;

  if (!exactGovId) {
    const result = await resolveJobId(cleanSearchTitle.value);

    switch (result.type) {
      case 'exact':
        exactGovId = result.id;
        break;

      case 'ambiguous':
        ambiguityOptions.value = result.options;
        if (result.options && result.options.length === 1 && result.options[0]) {
          await onAmbiguityResolved(result.options[0].id_code);
          return;
        }
        showAmbiguityModal.value = true;
        loading.value = false;
        return;

      case 'unmapped':
      case 'error':
        break;
    }
  }

  await executeNavigation(cleanSearchTitle.value, exactGovId);
};

const onAmbiguityResolved = async (resolvedGovId: string): Promise<void> => {
  showAmbiguityModal.value = false;
  loading.value = true;

  const selectedMatch = ambiguityOptions.value.find((opt) => opt.id_code === resolvedGovId);

  if (selectedMatch) {
    $fetch('/api/user/suggestion', {
      method: 'POST',
      body: {
        search_term: cleanSearchTitle.value,
        target_id_code: resolvedGovId,
        target_group_name: selectedMatch.group_name,
        country: activeCountry.value
      }
    }).catch(() => {
      // Silently fail: suggestion tracking is best-effort and non-critical
    });

    trackAmbiguousSearch(cleanSearchTitle.value, selectedMatch.group_name);
  }

  await executeNavigation(cleanSearchTitle.value, resolvedGovId);
};

const executeNavigation = async (finalTitle: string, finalGovId?: string): Promise<void> => {
  const titleSlug = slugify(finalTitle);
  const countrySlug = activeCountry.value.toLowerCase();
  const locationSlug = location.value ? slugify(location.value) : '';

  const basePath = props.mode === 'benchmark' ? '/benchmark' : '/salary';
  const path = locationSlug
    ? `${basePath}/${titleSlug}/${countrySlug}/${locationSlug}`
    : `${basePath}/${titleSlug}/${countrySlug}`;

  trackSearch(
    finalTitle.trim(),
    activeCountry.value,
    location.value,
    String(salary.value),
    schedule.value,
    contract.value
  );

  const searchId = await logSearch(
    finalTitle.trim(),
    activeCountry.value,
    location.value,
    String(salary.value),
    schedule.value,
    contract.value
  );
  useState('currentSearchId').value = searchId;

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

  if (isSamePath) {
    loading.value = false;
  } else {
    setTimeout(() => {
      if (loading.value) {
        loading.value = false;
      }
    }, 5000);
  }
};
</script>
