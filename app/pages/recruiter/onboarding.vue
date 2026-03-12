<template>
  <div
    class="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
    <div
      class="absolute top-0 left-0 w-full h-100 bg-linear-to-b from-secondary-900 to-slate-50 z-0"></div>

    <div
      class="relative z-10 w-full max-w-md bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-2xl">
      <div class="text-center mb-8">
        <div
          class="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 mx-auto mb-4 border border-primary-100">
          <Building2 class="w-8 h-8" />
        </div>
        <h1 class="text-2xl font-black text-slate-900">{{ $t('recruiter.onboarding.title') }}</h1>
        <p class="text-slate-500 text-sm mt-2">
          {{ $t('recruiter.onboarding.subtitle') }}
        </p>
      </div>

      <form class="space-y-6" @submit.prevent="saveProfile">
        <AmIInput
          v-model="agencyName"
          :label="$t('recruiter.onboarding.agency-label')"
          :placeholder="$t('recruiter.onboarding.agency-placeholder')"
          :icon="Building2" />

        <div
          v-if="error"
          class="text-[11px] font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
          {{ error }}
        </div>

        <AmIAnimatedBorder :loading="loading" active-bg-colour="bg-slate-400">
          <AmIButton
            title="continue"
            block
            type="submit"
            :disabled="loading || !agencyName"
            @click.prevent="saveProfile">
            {{
              loading
                ? $t('recruiter.onboarding.btn-loading')
                : $t('recruiter.onboarding.btn-default')
            }}
          </AmIButton>
        </AmIAnimatedBorder>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Building2 } from 'lucide-vue-next';
import { updateDoc, doc } from 'firebase/firestore';
import { useCurrentUser, useFirestore } from 'vuefire';

// Protect this route with your recruiters middleware
definePageMeta({
  middleware: 'recruiters'
});

// Import useI18n to translate strings inside the script!
const { t } = useI18n();

const user = useCurrentUser();
const db = useFirestore();

const agencyName = ref('');
const loading = ref(false);
const error = ref('');

const saveProfile = async () => {
  if (!agencyName.value) {
    error.value = t('recruiter.onboarding.errors.empty-agency');
    return;
  }

  if (!user.value) {
    error.value = t('recruiter.onboarding.errors.no-session');
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    await updateDoc(doc(db, 'users', user.value.uid), {
      agency_name: agencyName.value,
      onboarding_complete: true
    });

    await navigateTo('/recruiter/dashboard');
  } catch (e: any) {
    console.error('🔥 Error saving profile:', e);
    error.value = t('recruiter.onboarding.errors.save-failed');
  } finally {
    loading.value = false;
  }
};
</script>
