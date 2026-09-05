<template>
  <div class="min-h-screen bg-slate-50 p-4 pt-24 pb-32">
    <SectionSharedBackdrop />

    <div class="max-w-6xl mx-auto relative flex flex-col gap-6">
      <header
        class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-3xl shadow-md border border-slate-200">
        <div>
          <h1 class="text-3xl font-black text-slate-900">
            {{
              step === 1
                ? $t('recruiter.territories.get')
                : $t('recruiter.territories.claim.step-2')
            }}
          </h1>
          <p class="text-slate-500 mt-1">
            {{
              step === 1
                ? $t('recruiter.territories.claim.leads')
                : $t('recruiter.territories.claim.step-2-helper')
            }}
          </p>
        </div>
        <div class="flex flex-wrap gap-4 items-center">
          <AmITabs v-if="step === 1" v-model="selectedView" :options="views" round class="w-max" />
          <AmITabs v-if="step === 1" v-model="selectedCountry" :options="countries" round />
          <button
            v-else
            class="text-sm font-bold text-slate-400 hover:text-primary-600 transition-colors flex items-center gap-2"
            @click="step = 1">
            &larr; {{ $t('recruiter.territories.claim.back-to-selection') }}
          </button>
        </div>
      </header>

      <div
        v-if="step === 1"
        class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-500">
        <div class="lg:col-span-2 flex flex-col gap-2">
          <template v-if="selectedView === 'list'">
            <TerritoryList
              :options="listOptions"
              :selected-options="selectedTerritories"
              :claimed-ids="userClaimedIds"
              @territory-click="handleTerritoryClick" />
          </template>
          <div v-else class="map-view flex flex-col gap-6">
            <div class="bg-white p-5 rounded-3xl shadow-xs border border-slate-200">
              <TerritoryMap
                :country="selectedCountry"
                :territories="activeTerritories"
                :claimed-ids="userClaimedIds"
                :selected-ids="selectedTerritories.map((t) => t.id)"
                @territory-clicked="handleTerritoryClick" />
            </div>

            <TerritoryNonContiguousRegions
              v-if="selectedCountry === 'USA'"
              :selected-territories="selectedTerritories"
              :claimed-ids="userClaimedIds"
              @territory-clicked="handleTerritoryClick" />
          </div>
        </div>

        <div class="lg:col-span-1">
          <div class="bg-white p-6 rounded-3xl shadow-xs border border-slate-200 sticky top-8">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-black text-slate-900">
                {{ $t('recruiter.territories.claim.step-1') }}
              </h2>
            </div>

            <div
              v-if="selectedTerritories.length === 0"
              class="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <p class="text-slate-500 font-medium">
                {{ $t('recruiter.territories.claim.click-map') }}
              </p>
            </div>

            <div v-else class="space-y-6">
              <div>
                <div class="flex justify-between items-end mb-2">
                  <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    {{ $t('recruiter.territories.claim.target-regions') }}
                  </label>
                  <button
                    class="text-xs font-bold text-slate-400 hover:text-negative-500 transition-colors"
                    @click="selectedTerritories = []">
                    {{ $t('recruiter.territories.claim.clear-all') }}
                  </button>
                </div>

                <AmIButtonList
                  :options="territoryOptions"
                  :selected-options="selectedTerritories"
                  max-height="max-h-40"
                  @remove="removeTerritory($event as number)" />
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  {{
                    $t('recruiter.territories.claim.target-industries', {
                      country: selectedCountry
                    })
                  }}
                </label>
                <p
                  v-if="userProfile?.coveredCategories?.length"
                  class="text-2xs text-slate-400 mt-2 font-medium">
                  {{ $t('recruiter.territories.claim.agency-profile-helper') }}
                </p>

                <AmIInputSelect
                  v-model="selectedCategories"
                  :options="intelligentCategories"
                  :placeholder="$t('recruiter.territories.claim.search-industries')"
                  :loading="loadingCategories"
                  external-list />

                <AmIButtonList
                  :options="intelligentCategories"
                  :selected-options="selectedCategories"
                  @remove="removeCategoryFromList($event as string)" />
              </div>

              <hr class="border-slate-100" />

              <button
                :disabled="!isReadyForSchedule"
                :class="[
                  'w-full py-4 rounded-xl font-black text-lg transition-all',
                  isReadyForSchedule
                    ? 'bg-primary-600 text-white shadow-md hover:bg-primary-700 hover:shadow-lg'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                ]"
                @click="continueToSchedule">
                {{ $t('recruiter.territories.claim.configure-schedule') }} &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="step === 2" class="animate-in fade-in slide-in-from-right-4 duration-500">
        <div
          v-if="claimsLimitExceeded"
          class="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3">
          <span class="text-amber-500 text-lg leading-none mt-0.5">⚠</span>
          <p class="text-sm font-medium">
            {{ $t('recruiter.territories.claim.limit-warning') }}
          </p>
        </div>

        <TerritoryScheduleMatrix
          :territories="selectedTerritories"
          :categories="selectedCategories"
          :category-options="intelligentCategories"
          :taken-months="globalTakenMonths"
          @update:selections="scheduleSelections = $event" />

        <div class="mt-6 flex justify-end">
          <AmIButton
            :title="$t('recruiter.territories.claim.finalize')"
            :disabled="scheduleSelections.length === 0 || isSubmitting"
            @click="submitSchedule">
            <div class="flex items-center gap-2 px-4 py-1">
              <span
                v-if="isSubmitting"
                class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>
                {{
                  isSubmitting
                    ? $t('recruiter.territories.claim.processing')
                    : $t('recruiter.territories.claim.action')
                }}
              </span>
            </div>
          </AmIButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// IMPORT YOUR CONSTANTS
import type { TerritoryListOption } from '../../../components/Territory/List.vue';
import type { ScheduleSelection } from '../../../components/Territory/ScheduleMatrix.vue';
import type { JobCategoryEntry } from '~~/shared/utils/market-data';
import type { TerritoryClaim } from '~~/shared/utils/types';

definePageMeta({
  middleware: ['recruiters', 'recruiter-verified']
});

export type CountryCode = 'UK' | 'USA';
export type ViewType = 'list' | 'map';
export type TerritoryOption = { label: string; value: number };

// Common shape shared by every source that can populate `selectedTerritories`
// (the map, the list view, and the non-contiguous USA regions widget) --
// all of them guarantee at least an id + name, with an optional band.
type SelectedTerritory = { id: number; name: string; band?: number };

// The `adzuna_categories` Firestore documents carry an `id` alongside the
// base label/tag entry (see StoredAdzunaCategory in admin/adzuna.vue), even
// though the composable's declared type only models label/tag.
type CategoryEntry = JobCategoryEntry & { id?: string; country?: string };

const { t } = useI18n();
const { showToast } = useSystemToast();

const user = useCurrentUser();
const { ukTerritories, usaTerritories } = useTerritories();

const countries = [
  { value: 'UK', label: t('common.uk') },
  { value: 'USA', label: t('common.usa') }
];

const views = [
  { value: 'map', label: t('common.map') },
  { value: 'list', label: t('common.list') }
];

// 1. Bring in our clean data layers!
const { userProfile } = useUserProfile();
const { categories: categoriesData, loadingCategories } = useCategories();

// 2. State Management
const selectedCountry = ref<CountryCode>('UK');
const selectedView = ref<ViewType>('map');
const selectedTerritories = ref<SelectedTerritory[]>([]); // Array of selected map regions
const selectedCategories = ref<string[]>([]); // Array of selected industries

// Wizard & Submission State
const step = ref<1 | 2>(1);
const scheduleSelections = ref<ScheduleSelection[]>([]);
const isSubmitting = ref(false);

const userClaimedIds = computed(() => {
  if (!userProfile.value) {
    return [];
  }
  const active = userProfile.value.activeTerritories || userProfile.value.claims || [];
  return active
    .map((t: TerritoryClaim & { id?: number }) => t.territoryId ?? t.id)
    .filter((id): id is number => id !== undefined);
});

// 1. Create a reactive array of all the territory IDs they clicked
const selectedIds = computed(() => selectedTerritories.value.map((t) => t.id));

// 2. Call the exact same composable!
const { globalTakenMonths, claimsLimitExceeded } = useTerritoryClaims(selectedIds);

// 3. Map Data
const activeTerritories = computed(() => {
  return selectedCountry.value === 'UK' ? ukTerritories : usaTerritories;
});

const territoryOptions = computed<TerritoryOption[]>(() => {
  return selectedTerritories.value.map((t) => ({
    label: t.name,
    value: t.id
  }));
});

const listOptions = computed<TerritoryListOption[]>(() => {
  const list = selectedCountry.value === 'UK' ? ukTerritories : usaTerritories;

  return list.map((t) => {
    return {
      name: t.name,
      id: t.id,
      region: t.region.name
    };
  });
});

// 4. Intelligent Category Dropdown Logic
const intelligentCategories = computed(() => {
  if (!categoriesData.value) {
    return [];
  }

  const countrySpecificCategories = categoriesData.value.filter(
    (cat: CategoryEntry) => cat.country === selectedCountry.value.toUpperCase()
  );

  const allFormatted: { label: string; value: string }[] = countrySpecificCategories.map(
    (cat: CategoryEntry) => ({
      label: cat.label || cat.id || '',
      value: cat.label || cat.id || ''
    })
  );

  if (userProfile.value?.coveredCategories && userProfile.value.coveredCategories.length > 0) {
    return allFormatted.filter((cat: { label: string; value: string }) =>
      userProfile.value!.coveredCategories!.includes(cat.value)
    );
  }

  return allFormatted;
});

// 5. Validation Check
const isReadyForSchedule = computed(() => {
  return selectedTerritories.value.length > 0 && selectedCategories.value.length > 0;
});

// 6. Map Click & Toggle Handlers
const handleTerritoryClick = (territory: SelectedTerritory): void => {
  const index = selectedTerritories.value.findIndex((t) => t.id === territory.id);
  if (index > -1) {
    selectedTerritories.value.splice(index, 1);
  } else {
    selectedTerritories.value.push(territory);
  }
};

const removeTerritory = (id: number): void => {
  selectedTerritories.value = selectedTerritories.value.filter((t) => t.id !== id);
};

const removeCategoryFromList = (val: string): void => {
  selectedCategories.value = selectedCategories.value.filter((c) => c !== val);
};

// 7. Proceed to Step 2 (The Matrix)
const continueToSchedule = (): void => {
  if (!isReadyForSchedule.value) {
    return;
  }
  step.value = 2; // Transition the UI
};

// 8. Final Submission
// 8. Final Submission & Payment Routing
const submitSchedule = async (): Promise<void> => {
  if (scheduleSelections.value.length === 0) {
    return;
  }

  isSubmitting.value = true;

  try {
    const token = await user.value?.getIdToken();

    // Determine the currency based on the user's billing country
    const targetCurrency = userProfile.value?.billingCountry === 'USA' ? 'usd' : 'gbp';

    // Call your Stripe endpoint, passing the detailed schedule matrix!
    const response = await $fetch<{ url: string | null }>('/api/stripe/create-checkout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        // We pass the matrix selections so the backend knows exactly
        // which months are basic vs exclusive
        territories: scheduleSelections.value,
        currency: targetCurrency
      }
    });

    if (response.url) {
      // Redirect the user to the Stripe hosted checkout page
      window.location.href = response.url;
    } else {
      // Returning recruiter: billed against their existing subscription
      // directly, no Checkout redirect to follow.
      showToast('Success', t('recruiter.territories.claim.purchase-success'), 'success');
      await navigateTo('/recruiter/dashboard');
    }
  } catch (error) {
    // eslint-disable-next-line no-console -- surfaces checkout initialization failures for debugging; no dedicated error-logging utility for this page
    console.error('Failed to initialize payment:', error);
    showToast('Error', 'Something went wrong calculating the cart. Please try again.', 'error');
  } finally {
    isSubmitting.value = false;
  }
};

// Wipe cart when switching countries (Only happens in Step 1)
watch(selectedCountry, () => {
  selectedTerritories.value = [];
});
</script>
