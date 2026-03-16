<template>
  <div class="min-h-screen bg-slate-50 p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-8">
        <NuxtLink
          to="/recruiter/dashboard"
          class="text-slate-500 hover:text-primary-600 flex items-center gap-2 text-sm font-bold mb-4 transition-colors w-max">
          &larr; Back to Dashboard
        </NuxtLink>
        <h1 class="text-3xl font-black text-slate-900">Claim Territories</h1>
        <p class="text-slate-500 mt-1">
          Select an exclusive region and industry to start receiving candidate leads.
        </p>
      </div>

      <div class="bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-200">
        <div class="flex gap-4 mb-6">
          <button
            :class="[
              'px-6 py-2 rounded-full font-bold transition-colors',
              selectedCountry === 'uk'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            ]"
            @click="selectedCountry = 'uk'">
            United Kingdom
          </button>
          <button
            :class="[
              'px-6 py-2 rounded-full font-bold transition-colors',
              selectedCountry === 'usa'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            ]"
            @click="selectedCountry = 'usa'">
            United States
          </button>
        </div>

        <TerritoryMap
          :country="selectedCountry"
          :territories="activeTerritories"
          :claimed-ids="userClaimedIds"
          @territory-clicked="handleClaimTerritory" />

        <div v-if="selectedCountry === 'usa'" class="mt-8">
          <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
            Non-Contiguous Regions
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              v-for="state in ['Alaska', 'Hawaii', 'Puerto Rico']"
              :key="state"
              :class="[
                'p-4 rounded-2xl border transition-all flex items-center gap-4 text-left group',
                isClaimed(state)
                  ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-inner'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-primary-300 hover:shadow-md'
              ]"
              @click="claimByName(state)">
              <div
                :class="[
                  'w-20 h-20 shrink-0 transition-colors',
                  isClaimed(state)
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
                  v-if="isClaimed(state)"
                  class="text-xs font-bold text-primary-600 uppercase tracking-wide">
                  Claimed
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCurrentUser, useFirestore } from 'vuefire';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { RECRUITER_TERRITORIES_UK } from '~~/utils/locations/uk';
import { RECRUITER_TERRITORIES_USA } from '~~/utils/locations/usa';

definePageMeta({ middleware: ['recruiters'] });

const user = useCurrentUser();
const db = useFirestore();

const selectedCountry = ref<'uk' | 'usa'>('uk');
const userClaimedIds = ref<number[]>([]); // We will eventually sync this live with Firestore

const activeTerritories = computed(() => {
  return selectedCountry.value === 'uk' ? RECRUITER_TERRITORIES_UK : RECRUITER_TERRITORIES_USA;
});

// CLAIMING LOGIC
const handleClaimTerritory = async (territory: any) => {
  if (!user.value) return;

  // Quick optimistic UI update so it turns blue instantly
  if (!userClaimedIds.value.includes(territory.id)) {
    userClaimedIds.value.push(territory.id);
  }

  try {
    const userRef = doc(db, 'users', user.value.uid);
    await updateDoc(userRef, {
      claims: arrayUnion(territory.id)
    });
    console.log(`Successfully claimed ${territory.name}!`);
  } catch (error) {
    console.error('Error claiming territory:', error);
    // Revert optimistic update if it failed
    userClaimedIds.value = userClaimedIds.value.filter((id) => id !== territory.id);
    alert('Failed to save claim. Please try again.');
  }
};

// SVG BOX HELPER FUNCTIONS
const claimByName = (stateName: string) => {
  const territory = RECRUITER_TERRITORIES_USA.find((t) => t.name === stateName);
  if (territory) handleClaimTerritory(territory);
};

const isClaimed = (stateName: string) => {
  const territory = RECRUITER_TERRITORIES_USA.find((t) => t.name === stateName);
  return territory ? userClaimedIds.value.includes(territory.id) : false;
};
</script>
