<template>
  <div class="bg-slate-50 p-4 pt-24 min-h-screen">
    <SectionSharedBackdrop />

    <div class="max-w-2xl mx-auto relative flex flex-col gap-6">
      <header
        class="flex items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-md border border-slate-200">
        <div class="flex items-center gap-4">
          <button
            class="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            title="Back to Dashboard"
            @click="navigateTo('/recruiter/dashboard')">
            &larr;
          </button>
          <h1 class="text-2xl font-black text-slate-900">
            {{ $t('recruiter.account.page-title') }}
          </h1>
        </div>
      </header>

      <div class="bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-200">
        <div class="flex items-center gap-3 mb-8">
          <div
            class="w-10 h-10 bg-secondary-50 rounded-xl flex items-center justify-center text-secondary-600">
            <BriefcaseBusiness class="w-5 h-5" />
          </div>
          <h2 class="text-xl font-bold text-slate-900">{{ $t('recruiter.account.heading') }}</h2>
        </div>

        <div v-if="userProfile" class="space-y-4">
          <div class="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
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
              <p class="font-medium text-slate-900 truncate">{{ userProfile.email }}</p>
            </div>
          </div>

          <hr class="border-slate-100 my-6" />

          <div class="relative">
            <label class="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {{ $t('recruiter.account.inbound.email') }}
            </label>
            <p class="text-xs text-slate-500 mb-3">
              {{ $t('recruiter.account.inbound.email-helper') }}
            </p>

            <input
              v-model="inboundEmail"
              type="email"
              :placeholder="$t('recruiter.account.inbound.email-placeholder')"
              class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400 shadow-sm" />
          </div>

          <hr class="border-slate-100 my-6" />

          <div class="relative">
            <div class="flex items-center justify-between mb-1">
              <p class="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                {{ $t('recruiter.account.billing-currency') }}
              </p>
              <div v-if="isUpdatingBilling" class="flex items-center gap-1.5">
                <span
                  class="text-[9px] font-bold text-primary-600 uppercase tracking-wider animate-pulse"
                  >{{ $t('recruiter.account.saving') }}</span
                >
                <span
                  class="w-2.5 h-2.5 border border-slate-200 border-t-primary-500 rounded-full animate-spin"></span>
              </div>
            </div>

            <p class="text-xs text-slate-500 mb-3">
              {{ $t('recruiter.account.billing-helper') }}
            </p>

            <AmIInputSelect
              v-model="billingPreference"
              :options="currencyOptions"
              :disabled="isUpdatingBilling"
              single
              @update:model-value="handleBillingChange" />
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
                  {{ $t('recruiter.industries.selected-count') }} ({{ selectedCategories.length }})
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
                class="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                <div
                  v-for="catValue in selectedCategories"
                  :key="catValue"
                  class="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-xs group">
                  <div class="flex items-center gap-2 overflow-hidden">
                    <div class="w-2 h-2 rounded-full bg-primary-500 shrink-0"></div>
                    <span class="font-bold text-slate-700 text-sm truncate">
                      {{ getCategoryLabel(catValue) }}
                    </span>
                  </div>
                  <button
                    class="text-slate-400 hover:text-negative-500 p-1.5 rounded hover:bg-negative-50 transition-colors shrink-0"
                    title="Remove"
                    @click="removeCategoryFromList(catValue)">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
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

            <div class="mt-6 flex items-center justify-between pt-6 border-t border-slate-100">
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
                  'px-6 py-3 rounded-xl font-bold transition-all text-sm flex items-center gap-2',
                  isSaving
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md'
                ]"
                @click="saveProfileCategories">
                <span
                  v-if="isSaving"
                  class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                {{ isSaving ? $t('common.saved.saving') : $t('common.saved.save') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { BriefcaseBusiness, CheckSquareIcon } from 'lucide-vue-next';

definePageMeta({
  middleware: 'recruiters'
});

const { userProfile, updateProfile } = useUserProfile();
const { categories: categoriesData, loadingCategories } = useCategories();
const { t } = useI18n();

const selectedCategories = ref<string[]>([]);
const isSaving = ref(false);
const showSuccess = ref(false);
const inboundEmail = ref<string>('');

const billingPreference = ref(['UK']);
const isUpdatingBilling = ref(false);

const currencyOptions = [
  { label: t('recruiter.account.currency-uk'), value: 'UK' },
  { label: t('recruiter.account.currency-usa'), value: 'USA' }
];

const formattedCategories = computed(() => {
  if (!categoriesData.value) return [];

  const uniqueCategories = new Map();

  categoriesData.value.forEach((cat: any) => {
    const val = cat.label || cat.id;

    // Only add it if we haven't seen this exact category name yet
    if (!uniqueCategories.has(val)) {
      uniqueCategories.set(val, {
        label: val,
        value: val
      });
    }
  });

  return Array.from(uniqueCategories.values());
});

const getCategoryLabel = (val: string) => {
  const found = formattedCategories.value.find((c) => c.value === val);
  return found ? found.label : val;
};

const removeCategoryFromList = (val: string) => {
  selectedCategories.value = selectedCategories.value.filter((c) => c !== val);
};

watch(
  userProfile,
  (newProfile) => {
    if (newProfile) {
      if (newProfile.coveredCategories) {
        selectedCategories.value = [...newProfile.coveredCategories];
      }
      if (newProfile.billingCountry) {
        billingPreference.value = [newProfile.billingCountry];
      }
      if (newProfile.inboundEmail) {
        inboundEmail.value = newProfile.inboundEmail;
      }
    }
  },
  { immediate: true }
);

const handleBillingChange = async (newValArray: string[]) => {
  const selectedCurrency = newValArray.length > 0 ? newValArray[0] : 'UK';
  isUpdatingBilling.value = true;
  try {
    await updateProfile({ billingCountry: selectedCurrency });
  } catch (error) {
    console.error('Failed to update billing preference:', error);
  } finally {
    setTimeout(() => {
      isUpdatingBilling.value = false;
    }, 500);
  }
};

const saveProfileCategories = async () => {
  isSaving.value = true;
  showSuccess.value = false;
  try {
    await updateProfile({
      coveredCategories: selectedCategories.value,
      inboundEmail: inboundEmail.value
    });
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
