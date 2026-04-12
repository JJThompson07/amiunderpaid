<template>
  <div class="min-h-screen bg-slate-50 p-4 pt-24 pb-32">
    <SectionSharedBackdrop />

    <div class="max-w-6xl mx-auto relative flex flex-col gap-6">
      <header
        class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl shadow-md border border-slate-200">
        <div>
          <h1 class="text-3xl font-black text-slate-900">
            {{ step === 1 ? $t('recruiter.territories.get') : 'Step 2: Claim Your Schedule' }}
          </h1>
          <p class="text-slate-500 mt-1">
            {{
              step === 1
                ? $t('recruiter.territories.claim.leads')
                : 'Select the upcoming months you want to receive leads for.'
            }}
          </p>
        </div>
        <AmITabs v-if="step === 1" v-model="selectedCountry" :options="countries" round />
        <button
          v-else
          class="text-sm font-bold text-slate-400 hover:text-primary-600 transition-colors flex items-center gap-2"
          @click="step = 1">
          &larr; Back to Selection
        </button>
      </header>

      <AmITabs v-if="step === 1" v-model="selectedView" :options="views" round class="w-max" />

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
            <div class="bg-white p-6 rounded-3xl shadow-xs border border-slate-200 mb-6">
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
              <h2 class="text-xl font-black text-slate-900">Step 1: Select Targets</h2>
            </div>

            <div
              v-if="selectedTerritories.length === 0"
              class="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <p class="text-slate-500 font-medium">Click regions on the map to begin.</p>
            </div>

            <div v-else class="space-y-6">
              <div>
                <div class="flex justify-between items-end mb-2">
                  <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block"
                    >Target Regions</label
                  >
                  <button
                    class="text-xs font-bold text-slate-400 hover:text-negative-500 transition-colors"
                    @click="selectedTerritories = []">
                    Clear All
                  </button>
                </div>

                <AmIButtonList
                  :options="territoryOptions"
                  :selected-options="selectedTerritories"
                  max-height="max-h-40"
                  @remove="removeTerritory($event)" />
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  Target Industries {{ selectedCountry }}
                </label>
                <p
                  v-if="userProfile?.coveredCategories?.length"
                  class="text-2xs text-slate-400 mt-2 font-medium">
                  Showing industries from your Agency Profile.
                </p>

                <AmIInputSelect
                  v-model="selectedCategories"
                  :options="intelligentCategories"
                  placeholder="Search industries..."
                  :loading="loadingCategories"
                  external-list />

                <AmIButtonList
                  :options="intelligentCategories"
                  :selected-options="selectedCategories"
                  @remove="removeCategoryFromList($event)" />
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
                Configure Schedule &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="step === 2" class="animate-in fade-in slide-in-from-right-4 duration-500">
        <TerritoryScheduleMatrix
          :territories="selectedTerritories"
          :categories="selectedCategories"
          :category-options="intelligentCategories"
          @update:selections="scheduleSelections = $event" />

        <div class="mt-6 flex justify-end">
          <AmIButton
            title="Finalize Claims"
            :disabled="scheduleSelections.length === 0 || isSubmitting"
            @click="submitSchedule">
            <div class="flex items-center gap-2 px-4 py-1">
              <span
                v-if="isSubmitting"
                class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>{{ isSubmitting ? 'Processing...' : 'Confirm & Save Schedule' }}</span>
            </div>
          </AmIButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

// IMPORT YOUR CONSTANTS
import type { TerritoryListOption } from '../../components/Territory/List.vue';

// definePageMeta({
//   middleware: 'recruiters'
// });

export type CountryCode = 'UK' | 'USA';
export type ViewType = 'list' | 'map';
export type TerritoryOption = { label: string; value: number };

const { t } = useI18n();

const firebaseAuth = useFirebaseAuth();
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
const selectedTerritories = ref<any[]>([]); // Array of selected map regions
const selectedCategories = ref<string[]>([]); // Array of selected industries

// Wizard & Submission State
const step = ref<1 | 2>(1);
const scheduleSelections = ref<any[]>([]);
const isSubmitting = ref(false);

const userClaimedIds = computed(() => {
  if (!userProfile.value) return [];
  const active = userProfile.value.activeTerritories || userProfile.value.claims || [];
  return active.map((t: any) => t.territoryId || t.id);
});

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
  if (!categoriesData.value) return [];

  const countrySpecificCategories = categoriesData.value.filter(
    (cat: any) => cat.country === selectedCountry.value.toUpperCase()
  );

  const allFormatted = countrySpecificCategories.map((cat: any) => ({
    label: cat.label || cat.id,
    value: cat.label || cat.id
  }));

  if (userProfile.value?.coveredCategories && userProfile.value.coveredCategories.length > 0) {
    return allFormatted.filter((cat: any) =>
      userProfile.value!.coveredCategories.includes(cat.value)
    );
  }

  return allFormatted;
});

// 5. Validation Check
const isReadyForSchedule = computed(() => {
  return selectedTerritories.value.length > 0 && selectedCategories.value.length > 0;
});

// 6. Map Click & Toggle Handlers
const handleTerritoryClick = (territory: any) => {
  const index = selectedTerritories.value.findIndex((t) => t.id === territory.id);
  if (index > -1) {
    selectedTerritories.value.splice(index, 1);
  } else {
    selectedTerritories.value.push(territory);
  }

  console.log('Selected Territories:', selectedTerritories.value);
};

const removeTerritory = (id: number) => {
  selectedTerritories.value = selectedTerritories.value.filter((t) => t.id !== id);
};

const removeCategoryFromList = (val: string) => {
  selectedCategories.value = selectedCategories.value.filter((c) => c !== val);
};

// 7. Proceed to Step 2 (The Matrix)
const continueToSchedule = () => {
  if (!isReadyForSchedule.value) return;
  step.value = 2; // Transition the UI
};

// 8. Final Submission
// 8. Final Submission & Payment Routing
const submitSchedule = async () => {
  if (scheduleSelections.value.length === 0) return;

  isSubmitting.value = true;

  try {
    const token = await firebaseAuth?.currentUser?.getIdToken();

    // Determine the currency based on the selected country
    const targetCurrency = selectedCountry.value === 'USA' ? 'usd' : 'gbp';

    // Call your Stripe endpoint, passing the detailed schedule matrix!
    const response = await $fetch<{ url: string }>('/api/stripe/create-checkout', {
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

    // Redirect the user to the Stripe hosted checkout page
    if (response.url) {
      window.location.href = response.url;
    }
  } catch (error) {
    console.error('Failed to initialize payment:', error);
    alert('Something went wrong calculating the cart. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
};

// Wipe cart when switching countries (Only happens in Step 1)
watch(selectedCountry, () => {
  selectedTerritories.value = [];
});
</script>
