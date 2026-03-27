<template>
  <div class="bg-slate-50 p-4 pt-24">
    <SectionSharedBackdrop />

    <div class="max-w-6xl mx-auto relative flex flex-col gap-8">
      <header
        class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-md border border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900">{{ $t('recruiter.dashboard.title') }}</h1>
          <p v-if="userProfile" class="text-slate-500">
            <i18n-t
              keypath="recruiter.dashboard.welcome"
              tag="span"
              class="leading-relaxed text-xs text-slate-500">
              <template #name>
                <strong class="text-primary-700">{{ userProfile.agency_name }}</strong>
              </template>
            </i18n-t>
          </p>
          <AmILoader v-else :message="$t('recruiter.dashboard.loading')" />
        </div>

        <AmIButton
          title="logout"
          class="w-full md:w-auto"
          bg-colour="bg-slate-500"
          animation-colour="bg-slate-400"
          @click="handleLogout">
          {{ $t('common.logout') }}
        </AmIButton>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          class="md:col-span-2 bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-200">
          <div class="flex items-center justify-between gap-3 mb-6">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                <MapPin class="w-5 h-5" />
              </div>
              <h2 class="text-xl font-bold text-slate-900">{{ $t('recruiter.territories.my') }}</h2>
            </div>
            <NuxtLink
              to="/recruiter/territories"
              class="transition-all duration-700 ease-in-out bg-primary-500 text-white hover:bg-primary-400 py-2 px-4 rounded-xl font-bold text-sm"
              >{{ $t('recruiter.territories.get') }}</NuxtLink
            >
          </div>

          <div
            v-if="!userProfile?.claims || userProfile.claims.length === 0"
            class="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 mt-4 p-4">
            <Map class="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 class="text-slate-700 font-bold mb-1">
              {{ $t('recruiter.territories.none') }}
            </h3>
            <p class="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              {{ $t('recruiter.territories.claim.leads') }}
            </p>
            <AmIButton title="Claim Territory" @click="navigateTo('/recruiter/territories')">
              {{ $t('recruiter.territories.claim.first') }}
            </AmIButton>
          </div>

          <div v-else>
            <p>Territories go here...</p>
          </div>
        </div>

        <div
          class="md:col-span-1 bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-200 h-max">
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-10 h-10 bg-secondary-50 rounded-xl flex items-center justify-center text-secondary-600">
              <BriefcaseBusiness class="w-5 h-5" />
            </div>
            <h2 class="text-xl font-bold text-slate-900">{{ $t('recruiter.account.heading') }}</h2>
          </div>

          <div v-if="userProfile" class="space-y-4">
            <div>
              <p class="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {{ $t('recruiter.account.name') }}
              </p>
              <p class="font-medium text-slate-900">{{ userProfile.agency_name }}</p>
            </div>
            <div>
              <p class="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {{ $t('common.email') }}
              </p>
              <p class="font-medium text-slate-900">{{ userProfile.email }}</p>
            </div>
            <div>
              <p class="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {{ $t('recruiter.account.status.label') }}
              </p>
              <div
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-bold border border-green-200">
                <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                {{ $t('recruiter.account.status.active') }}
              </div>
            </div>

            <hr class="border-slate-100 my-6" />

            <div>
              <p class="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {{ $t('common.industries') }}
              </p>
              <p class="text-xs text-slate-500 mb-4">{{ $t('recruiter.industries.helper') }}</p>

              <AmIInputSelect
                v-model="selectedCategories"
                :options="formattedCategories"
                :placeholder="$t('recruiter.industries.search')"
                :loading="loadingCategories"
                external-list />

              <div class="mt-5">
                <div class="flex justify-between items-end mb-2">
                  <h4 class="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                    {{ $t('common.selected') }} ({{ selectedCategories.length }})
                  </h4>
                  <button
                    v-if="selectedCategories.length > 0"
                    class="text-xs font-bold text-slate-400 hover:text-negative-500 transition-colors"
                    @click="selectedCategories = []">
                    {{ $t('common.clear') }}
                  </button>
                </div>

                <div
                  v-if="selectedCategories.length === 0"
                  class="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                  <p class="text-xs text-slate-500 font-medium">
                    {{ $t('recruiter.industries.none') }}
                  </p>
                </div>

                <div
                  v-else
                  class="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  <div
                    v-for="catValue in selectedCategories"
                    :key="catValue"
                    class="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs group">
                    <div class="flex items-center gap-2 overflow-hidden">
                      <div class="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0"></div>
                      <span class="font-bold text-slate-700 text-xs truncate">
                        {{ getCategoryLabel(catValue) }}
                      </span>
                    </div>
                    <button
                      class="text-slate-400 hover:text-negative-500 p-1 rounded hover:bg-negative-50 transition-colors shrink-0"
                      title="Remove"
                      @click="removeCategoryFromList(catValue)">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2.5">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div class="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
                <p
                  v-if="showSuccess"
                  class="text-xs font-bold text-positive-600 animate-pulse flex gap-1 items-center">
                  <CheckSquareIcon class="h-4 w-4" />
                  {{ $t('common.saved.success', { items: $t('common.categories') }) }}
                </p>
                <p v-else></p>

                <button
                  :disabled="isSaving"
                  :class="[
                    'px-5 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center gap-2',
                    isSaving
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md'
                  ]"
                  @click="saveProfileCategories">
                  <span
                    v-if="isSaving"
                    class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  {{ isSaving ? $t('common.saved.saving') : $t('common.saved.save') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { MapPin, BriefcaseBusiness, Map } from 'lucide-vue-next';

definePageMeta({
  middleware: 'recruiters'
});

// 1. Use our incredibly clean Composables!
const { logout } = useRecruiterAuth();
const { userProfile, updateProfile } = useUserProfile();
const { categories: categoriesData, loadingCategories } = useCategories();

// State for Categories UI
const selectedCategories = ref<string[]>([]);
const isSaving = ref(false);
const showSuccess = ref(false);

// Format categories for the autocomplete component
const formattedCategories = computed(() => {
  if (!categoriesData.value) return [];
  return categoriesData.value.map((cat: any) => ({
    label: cat.label || cat.id,
    value: cat.label || cat.id
  }));
});

// Helper to display the readable label in the list
const getCategoryLabel = (val: string) => {
  const found = formattedCategories.value.find((c) => c.value === val);
  return found ? found.label : val;
};

// Remove individual category
const removeCategoryFromList = (val: string) => {
  selectedCategories.value = selectedCategories.value.filter((c) => c !== val);
};

// Sync database state to local ref
watch(
  userProfile,
  (newProfile) => {
    if (newProfile && newProfile.coveredCategories) {
      selectedCategories.value = [...newProfile.coveredCategories];
    }
  },
  { immediate: true }
);

// Clean Save Logic
const saveProfileCategories = async () => {
  isSaving.value = true;
  showSuccess.value = false;

  try {
    // Calling the abstracted Firestore method!
    await updateProfile({ coveredCategories: selectedCategories.value });

    showSuccess.value = true;
    setTimeout(() => {
      showSuccess.value = false;
    }, 3000);
  } catch {
    alert('Failed to save categories. Please try again.');
  } finally {
    isSaving.value = false;
  }
};

const handleLogout = async () => {
  await logout();
  await navigateTo('/recruiter/login');
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
