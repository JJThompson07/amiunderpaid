<template>
  <div class="min-h-screen bg-slate-50 p-4 pt-24 pb-32">
    <div class="max-w-6xl mx-auto">
      <header
        class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 class="text-3xl font-black text-slate-900">Claim Territories</h1>
          <p class="text-slate-500 mt-1">
            Select exclusive regions and an industry to start receiving candidate leads.
          </p>
        </div>

        <div class="flex gap-2 bg-slate-200/50 p-1 rounded-full border border-slate-200">
          <button
            :class="[
              'px-6 py-2 rounded-full font-bold transition-all text-sm',
              selectedCountry === 'UK'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            ]"
            @click="handleCountryChange('UK')">
            United Kingdom
          </button>
          <button
            :class="[
              'px-6 py-2 rounded-full font-bold transition-all text-sm',
              selectedCountry === 'USA'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            ]"
            @click="handleCountryChange('USA')">
            United States
          </button>
        </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        <div class="lg:col-span-2">
          <div class="bg-white p-6 rounded-3xl shadow-xs border border-slate-200 mb-6">
            <TerritoryMap
              :country="selectedCountry"
              :territories="activeTerritories"
              :claimed-ids="[]"
              :selected-ids="selectedTerritories.map((t) => t.id)"
              @territory-clicked="handleTerritoryClick" />
          </div>

          <div v-if="selectedCountry === 'USA'" class="mb-8">
            <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
              Non-Contiguous Regions
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                v-for="state in ['Alaska', 'Hawaii', 'Puerto Rico']"
                :key="state"
                :class="[
                  'p-4 rounded-2xl border transition-all flex items-center gap-4 text-left group',
                  selectedTerritories.some((t) => t.name === state)
                    ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-inner'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-primary-300 hover:shadow-md'
                ]"
                @click="handleTerritoryClick(activeTerritories.find((t) => t.name === state))">
                <div
                  :class="[
                    'w-20 h-20 shrink-0 transition-colors',
                    selectedTerritories.some((t) => t.name === state)
                      ? 'text-primary-500'
                      : 'text-slate-400 group-hover:text-primary-500'
                  ]">
                  <div
                    class="w-full h-full bg-current"
                    :style="{
                      WebkitMaskImage: `url('/${state.toLowerCase().replace(' ', '-')}.svg')`,
                      maskImage: `url('/${state.toLowerCase().replace(' ', '-')}.svg')`,
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center',
                      maskPosition: 'center'
                    }"></div>
                </div>
                <div class="flex-1">
                  <span class="font-bold block text-lg">{{ state }}</span>
                  <span
                    v-if="selectedTerritories.some((t) => t.name === state)"
                    class="text-xs font-bold text-primary-600 uppercase tracking-wide">
                    Selected
                  </span>
                </div>
              </button>
            </div>
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

                <div class="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  <div
                    v-for="terr in selectedTerritories"
                    :key="terr.id"
                    class="p-3 bg-primary-50 text-primary-700 font-bold rounded-xl border border-primary-100 flex justify-between items-center">
                    <span class="truncate pr-2 text-sm">{{ terr.name }}</span>
                    <button
                      class="text-primary-400 hover:text-negative-500 p-1 rounded-md transition-colors"
                      @click="removeTerritory(terr.id)">
                      <X class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  Target Industries {{ selectedCountry }}
                </label>

                <AmIInputSelect
                  v-model="selectedCategories"
                  :options="intelligentCategories"
                  placeholder="Search industries..."
                  :loading="loadingCategories" />

                <p
                  v-if="userProfile?.coveredCategories?.length"
                  class="text-2xs text-slate-400 mt-2 font-medium">
                  Showing industries from your Agency Profile.
                </p>
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
import { X } from 'lucide-vue-next';

// IMPORT YOUR CONSTANTS
import { RECRUITER_TERRITORIES_UK } from '~~/utils/locations/uk';
import { RECRUITER_TERRITORIES_USA } from '~~/utils/locations/usa';

export type CountryCode = 'UK' | 'USA';

// 1. Bring in our clean data layers!
const { userProfile } = useUserProfile();
const { categories: categoriesData, loadingCategories } = useCategories();

// 2. State Management
const selectedCountry = ref<CountryCode>('UK');
const selectedTerritories = ref<any[]>([]); // Array of selected map regions
const selectedCategories = ref<string[]>([]); // Array of selected industries

// 3. Map Data
const activeTerritories = computed(() => {
  return selectedCountry.value === 'UK' ? RECRUITER_TERRITORIES_UK : RECRUITER_TERRITORIES_USA;
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

const handleCountryChange = (country: CountryCode) => {
  if (selectedCountry.value !== country) {
    selectedCountry.value = country;
    selectedTerritories.value = []; // Wipe cart when switching countries
  }
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
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
}
</style>
