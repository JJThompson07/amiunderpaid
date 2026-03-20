<template>
  <div class="min-h-screen bg-slate-50 p-4 pt-24 pb-32">
    <SectionSharedBackdrop />

    <div class="max-w-6xl mx-auto relative flex flex-col gap-6">
      <header
        class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl shadow-md border border-slate-200">
        <div>
          <h1 class="text-3xl font-black text-slate-900">{{ $t('recruiter.territories.get') }}</h1>
          <p class="text-slate-500 mt-1">
            {{ $t('recruiter.territories.claim.leads') }}
          </p>
        </div>
        <AmITabs v-model="selectedCountry" :options="countries" round />
      </header>

      <AmITabs v-model="selectedView" :options="views" round class="w-max" />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 flex flex-col gap-2">
          <template v-if="selectedView === 'list'">
            <TerritoryList
              :options="listOptions"
              :selected-options="selectedTerritories"
              @territory-click="handleTerritoryClick" />
          </template>
          <div v-else class="map-view flex flex-col gap-6">
            <div class="bg-white p-6 rounded-3xl shadow-xs border border-slate-200 mb-6">
              <TerritoryMap
                :country="selectedCountry"
                :territories="activeTerritories"
                :claimed-ids="[]"
                :selected-ids="selectedTerritories.map((t) => t.id)"
                @territory-clicked="handleTerritoryClick" />
            </div>

            <TerritoryNonContiguousRegions
              v-if="selectedCountry === 'USA'"
              :selected-territories="selectedTerritories"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// IMPORT YOUR CONSTANTS
import { RECRUITER_TERRITORIES_UK } from '~~/utils/locations/uk';
import { RECRUITER_TERRITORIES_USA } from '~~/utils/locations/usa';
import type { TerritoryListOption } from '../../components/Territory/List.vue';

definePageMeta({
  middleware: 'recruiters'
});

export type CountryCode = 'UK' | 'USA';
export type ViewType = 'list' | 'map';
export type TerritoryOption = { label: string; value: number };

const { t } = useI18n();

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

// 3. Map Data
const activeTerritories = computed(() => {
  return selectedCountry.value === 'UK' ? RECRUITER_TERRITORIES_UK : RECRUITER_TERRITORIES_USA;
});

const territoryOptions = computed<TerritoryOption[]>(() => {
  return selectedTerritories.value.map((t) => ({
    label: t.name,
    value: t.id
  }));
});

const listOptions = computed<TerritoryListOption[]>(() => {
  const list =
    selectedCountry.value === 'UK' ? RECRUITER_TERRITORIES_UK : RECRUITER_TERRITORIES_USA;

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

  // STEP 1: Filter the raw database categories by the active country toggle ('uk' or 'usa')
  const countrySpecificCategories = categoriesData.value.filter(
    (cat: any) => cat.country === selectedCountry.value.toUpperCase()
  );

  // STEP 2: Format the filtered data into what the MultiSelectAutocomplete expects
  const allFormatted = countrySpecificCategories.map((cat: any) => ({
    label: cat.label || cat.id,
    value: cat.label || cat.id
  }));

  // STEP 3: If the user has explicitly defined categories in their profile, ONLY return those!
  if (userProfile.value?.coveredCategories && userProfile.value.coveredCategories.length > 0) {
    return allFormatted.filter((cat: any) =>
      userProfile.value!.coveredCategories.includes(cat.value)
    );
  }

  // STEP 4: Otherwise, return all the country-specific categories so brand new users aren't blocked
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
    selectedTerritories.value.splice(index, 1); // Remove if exists
  } else {
    selectedTerritories.value.push(territory); // Add if new
  }
};

const removeTerritory = (id: number) => {
  selectedTerritories.value = selectedTerritories.value.filter((t) => t.id !== id);
};

// Remove individual category
const removeCategoryFromList = (val: string) => {
  selectedCategories.value = selectedCategories.value.filter((c) => c !== val);
};

// 7. Proceed to Step 2 (The Matrix)
const continueToSchedule = () => {
  if (!isReadyForSchedule.value) return;

  // We have the raw ingredients! Assemble the payload.
  const payload = {
    locations: selectedTerritories.value.map((t) => ({ id: t.id, name: t.name })),
    categories: selectedCategories.value,
    country: selectedCountry.value
  };

  console.log('READY FOR MATRIX:', payload);

  // Todo: Trigger the Schedule View here!
};

watch(selectedCountry, () => {
  selectedTerritories.value = []; // Wipe cart when switching countries
});
</script>
