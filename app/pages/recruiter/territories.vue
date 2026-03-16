<template>
  <div class="min-h-screen bg-slate-50 p-4 pt-24 pb-32">
    <div class="max-w-6xl mx-auto">
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
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
              selectedCountry === 'uk'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            ]"
            @click="handleCountryChange('uk')">
            United Kingdom
          </button>
          <button
            :class="[
              'px-6 py-2 rounded-full font-bold transition-all text-sm',
              selectedCountry === 'usa'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            ]"
            @click="handleCountryChange('usa')">
            United States
          </button>
        </div>
      </div>

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

          <div v-if="selectedCountry === 'usa'" class="mb-8">
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
              <h2 class="text-xl font-black text-slate-900">Cart</h2>
              <span
                v-if="selectedTerritories.length > 0"
                class="bg-primary-100 text-primary-700 text-xs font-bold px-2 py-1 rounded-lg">
                {{ selectedTerritories.length }} Selected
              </span>
            </div>

            <div
              v-if="selectedTerritories.length === 0"
              class="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <p class="text-slate-500 font-medium">
                Click regions on the map to begin building your claim.
              </p>
            </div>

            <div v-else class="space-y-6">
              <div>
                <div class="flex justify-between items-end mb-2">
                  <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block"
                    >Selected Regions</label
                  >
                  <button
                    class="text-xs font-bold text-slate-400 hover:text-negative-500 transition-colors"
                    @click="selectedTerritories = []">
                    Clear All
                  </button>
                </div>

                <div class="space-y-2 max-h-50 overflow-y-auto pr-1 custom-scrollbar">
                  <div
                    v-for="terr in selectedTerritories"
                    :key="terr.id"
                    class="p-3 bg-primary-50 text-primary-700 font-bold rounded-xl border border-primary-100 flex justify-between items-center">
                    <span class="truncate pr-2">{{ terr.name }}</span>
                    <button
                      class="text-primary-400 hover:text-negative-500 p-1 rounded-md transition-colors"
                      title="Remove"
                      @click="removeTerritory(terr.id)">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="3">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block"
                  >Select Category</label
                >
                <select
                  v-model="selectedCategory"
                  class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="" disabled>Choose an industry...</option>
                  <option v-for="cat in availableCategories" :key="cat" :value="cat">
                    {{ cat }}
                  </option>
                </select>
              </div>

              <div>
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block"
                  >Subscription Length</label
                >
                <div class="grid grid-cols-2 gap-3">
                  <button
                    :class="[
                      'p-3 rounded-xl border font-bold transition-all',
                      selectedMonths === 1
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    ]"
                    @click="selectedMonths = 1">
                    1 Month
                  </button>
                  <button
                    :class="[
                      'p-3 rounded-xl border font-bold transition-all relative',
                      selectedMonths === 12
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    ]"
                    @click="selectedMonths = 12">
                    12 Months
                    <span
                      class="absolute -top-2 -right-2 bg-positive-500 text-white text-2xs uppercase tracking-wider font-black px-2 py-1 rounded-full"
                      >Save 20%</span
                    >
                  </button>
                </div>
              </div>

              <hr class="border-slate-100" />

              <button
                :disabled="!isReadyToCheckout"
                :class="[
                  'w-full py-4 rounded-xl font-black text-lg transition-all',
                  isReadyToCheckout
                    ? 'bg-primary-600 text-white shadow-md hover:bg-primary-700 hover:shadow-lg'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                ]"
                @click="proceedToCheckout">
                Proceed to Payment
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

// State Management
const selectedCountry = ref<'uk' | 'usa'>('uk');
const selectedTerritories = ref<any[]>([]); // ARRAY OF SELECTED REGIONS
const selectedCategory = ref<string>('');
const selectedMonths = ref<number>(1);

const availableCategories = [
  'Technology',
  'Healthcare',
  'Finance',
  'Construction',
  'Education',
  'Retail'
];

const activeTerritories = computed(() => {
  return selectedCountry.value === 'uk' ? RECRUITER_TERRITORIES_UK : RECRUITER_TERRITORIES_USA;
});

const isReadyToCheckout = computed(() => {
  return selectedTerritories.value.length > 0 && selectedCategory.value !== '';
});

// SMART MAP CLICK HANDLER (Toggle logic)
const handleTerritoryClick = (territory: any) => {
  // Check if we already clicked it
  const index = selectedTerritories.value.findIndex((t) => t.id === territory.id);

  if (index > -1) {
    // If it exists, remove it!
    selectedTerritories.value.splice(index, 1);
  } else {
    // If it doesn't exist, add it!
    selectedTerritories.value.push(territory);
  }
};

// Remove a specific territory via the "X" button
const removeTerritory = (id: number) => {
  selectedTerritories.value = selectedTerritories.value.filter((t) => t.id !== id);
};

// COUNTRY CHANGE HANDLER
const handleCountryChange = (country: 'uk' | 'usa') => {
  if (selectedCountry.value !== country) {
    selectedCountry.value = country;
    selectedTerritories.value = []; // WIPE THE CART!
  }
};

// CHECKOUT HANDLER
const proceedToCheckout = async () => {
  if (!isReadyToCheckout.value) return;

  const checkoutData = {
    // Map the array into a clean format for Stripe/Firebase
    locations: selectedTerritories.value.map((t) => ({ id: t.id, name: t.name })),
    country: selectedCountry.value,
    category: selectedCategory.value,
    durationMonths: selectedMonths.value
  };

  console.log('SENDING TO STRIPE:', checkoutData);
};
</script>

<style scoped>
/* Optional: Custom scrollbar for the cart if they select 10+ regions */
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
