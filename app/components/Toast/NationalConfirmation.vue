<template>
  <ToastGeneric
    v-model="showNationalToast"
    :duration="0"
    full-width
    bg-classes="bg-indigo-50 border-indigo-200">
    <div class="flex flex-col gap-4">
      <div
        v-for="country in pendingCountries"
        :key="country.code"
        class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="flex items-start gap-4">
          <div
            class="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200/50">
            <Globe class="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 class="text-base font-bold text-indigo-900">
              {{ $t('toast.national-confirmation.title', { country: $t(country.labelKey) }) }}
            </h3>
            <p class="text-sm text-indigo-700 mt-1 max-w-xl leading-relaxed">
              {{ $t('toast.national-confirmation.message', { country: $t(country.labelKey) }) }}
            </p>
          </div>
        </div>

        <AmIButton
          title="Confirm National Coverage"
          bg-colour="bg-indigo-600"
          text-colour="text-white"
          animation-colour="bg-indigo-700"
          class="py-2.5! px-5! text-sm shadow-none w-full md:w-auto shrink-0"
          :loading="confirmingCountry === country.code"
          @click="handleConfirm(country)">
          {{ $t('toast.national-confirmation.action.confirm') }}
        </AmIButton>
      </div>
    </div>
  </ToastGeneric>
</template>

<script setup lang="ts">
// components/Toast/NationalConfirmation.vue
import { computed, ref, watchEffect } from 'vue';
import { Globe } from 'lucide-vue-next';
import { useCurrentUser } from 'vuefire';

type PendingCountry = { code: 'UK' | 'USA'; currency: 'gbp' | 'usd'; labelKey: string };

const { userProfile } = useUserProfile();
const user = useCurrentUser();
const { showToast } = useSystemToast();
const { t } = useI18n();

const confirmingCountry = ref<'UK' | 'USA' | null>(null);

const pendingCountries = computed((): PendingCountry[] => {
  const countries: PendingCountry[] = [];
  if (userProfile.value?.ukNationalStatus === 'pending') {
    countries.push({ code: 'UK', currency: 'gbp', labelKey: 'common.uk' });
  }
  if (userProfile.value?.usaNationalStatus === 'pending') {
    countries.push({ code: 'USA', currency: 'usd', labelKey: 'common.usa' });
  }
  return countries;
});

const showNationalToast = ref(false);

watchEffect(() => {
  showNationalToast.value = pendingCountries.value.length > 0;
});

const handleConfirm = async (country: PendingCountry): Promise<void> => {
  if (confirmingCountry.value) {
    return;
  }
  confirmingCountry.value = country.code;

  try {
    const token = await user.value?.getIdToken();
    const response = await $fetch<{ url: string | null }>('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { territories: [], currency: country.currency }
    });

    if (response.url) {
      window.location.href = response.url;
    } else {
      // No redirect URL means this recruiter already had a live subscription --
      // create-checkout.post.ts billed the flat national charge into it directly
      // and flipped the status to 'active' -- so give explicit success feedback
      // here instead of leaving the toast spinning until Vuefire's reactive
      // userProfile update makes it disappear on its own.
      showToast(
        t('toast.type.success'),
        t('toast.national-confirmation.action.success', { country: t(country.labelKey) }),
        'success'
      );
    }
  } catch {
    showToast(t('toast.type.error'), t('toast.national-confirmation.action.error'), 'error');
  } finally {
    confirmingCountry.value = null;
  }
};
</script>
