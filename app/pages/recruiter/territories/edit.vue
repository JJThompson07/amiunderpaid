<template>
  <div class="min-h-screen bg-slate-50 p-4 pt-24 pb-32">
    <SectionSharedBackdrop />

    <div class="max-w-5xl mx-auto relative flex flex-col gap-6">
      <header
        class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-md border border-slate-200">
        <div>
          <button
            class="text-slate-400 hover:text-primary-600 transition-colors flex items-center gap-1 text-sm font-bold mb-2"
            @click="navigateTo('/recruiter/dashboard')">
            &larr; {{ $t('recruiter.territories.claim.back-to-selection') }}
          </button>
          <h1 class="text-3xl font-black text-slate-900">
            {{ $t('recruiter.territories.edit.title') }}
          </h1>
          <p class="text-slate-500 mt-1">
            {{ $t('recruiter.territories.edit.subtitle', { name: fullTerritory?.name || '' }) }}
          </p>
        </div>
      </header>

      <div
        v-if="loading"
        class="flex justify-center p-12 bg-white rounded-3xl border border-slate-200">
        <AmILoader :message="$t('recruiter.territories.edit.loading')" />
      </div>

      <div
        v-else-if="!ownedTerritory"
        class="bg-white p-12 rounded-3xl text-center border border-slate-200 shadow-sm">
        <h3 class="text-lg font-bold text-slate-800">
          {{ $t('recruiter.territories.edit.not-found') }}
        </h3>
        <p class="text-slate-500 mt-2 mb-6">
          {{ $t('recruiter.territories.edit.not-found-helper') }}
        </p>
        <AmIButton
          :title="$t('recruiter.territories.edit.return')"
          @click="navigateTo('/recruiter/dashboard')">
          {{ $t('recruiter.territories.edit.return') }}
        </AmIButton>
      </div>

      <div
        v-else
        class="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
        <TerritoryScheduleMatrix
          :territories="fullTerritory ? [fullTerritory] : []"
          :categories="[ownedTerritory.categoryValue]"
          :category-options="[{ label: categoryLabel, value: ownedTerritory.categoryValue }]"
          :taken-months="globalTakenMonths"
          @update:selections="scheduleSelections = $event" />

        <div class="flex justify-end mt-4">
          <AmIButton
            :title="$t('recruiter.territories.edit.upgrade-btn')"
            :disabled="scheduleSelections.length === 0 || isSubmitting"
            @click="submitUpgrade">
            <div class="flex items-center gap-2 px-4 py-1">
              <span
                v-if="isSubmitting"
                class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>
                {{
                  isSubmitting
                    ? $t('recruiter.territories.claim.processing')
                    : $t('recruiter.territories.edit.upgrade-btn')
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
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

definePageMeta({
  middleware: ['recruiters', 'recruiter-verified']
});

const route = useRoute();
const { userProfile } = useUserProfile();
const { getTerritoryById } = useTerritories();
const { categories: categoriesData } = useCategories();
const firebaseAuth = useFirebaseAuth();

const loading = ref(true);
const isSubmitting = ref(false);
const scheduleSelections = ref<any[]>([]);

// 1. Get the ID from the URL (?id=123)
const territoryId = computed(() => Number(route.query.id));

// 2. Find the owned territory in the user's profile
const ownedTerritory = computed(() => {
  if (!userProfile.value) return null;
  const active = userProfile.value.activeTerritories || userProfile.value.claims || [];
  return active.find((t: any) => t.territoryId === territoryId.value) || null;
});

// 3. Get the full territory details (for the name and band)
const fullTerritory = computed(() => {
  if (!ownedTerritory.value) return null;
  return getTerritoryById(territoryId.value);
});

// 4. Format the industry label nicely
const categoryLabel = computed(() => {
  if (!ownedTerritory.value || !categoriesData.value) return '';
  const val = ownedTerritory.value.categoryValue;
  const found = categoriesData.value.find((c: any) => c.id === val || c.label === val);
  return found ? found.label || found.id : val;
});

// 5. NEW: Use our clean composable for real-time locks!
// 1. Get the ID from the URL as an array
const territoryIdsForQuery = computed(() => [Number(route.query.id)]);

// 2. Call the composable
const { globalTakenMonths } = useTerritoryClaims(territoryIdsForQuery);

// 6. Checkout handler
const submitUpgrade = async () => {
  if (scheduleSelections.value.length === 0) return;

  isSubmitting.value = true;
  try {
    const token = await firebaseAuth?.currentUser?.getIdToken();
    const targetCurrency = userProfile.value?.billingCountry === 'USA' ? 'usd' : 'gbp';

    const response = await $fetch<{ url: string }>('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        territories: scheduleSelections.value,
        currency: targetCurrency,
        isUpgrade: true // Flag this as an upgrade for your backend!
      }
    });

    if (response.url) window.location.href = response.url;
  } catch (error) {
    console.error('Failed to initialize payment:', error);
    alert('Something went wrong. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  // Give the userProfile a tiny fraction of a second to hydrate before showing the 404
  setTimeout(() => {
    loading.value = false;
  }, 500);
});
</script>
