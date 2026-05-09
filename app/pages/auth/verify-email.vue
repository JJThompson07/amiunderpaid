<template>
  <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
    <SectionSharedBackdrop />
    <div
      class="max-w-md relative w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
      <div
        v-if="status === 'loading'"
        class="flex flex-col items-center animate-in fade-in duration-300">
        <AmILoader message="Verifying your email..." />
      </div>

      <div
        v-else-if="status === 'success'"
        class="flex relative flex-col items-center animate-in zoom-in-95 duration-300">
        <div
          class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6 border-4 border-emerald-50">
          <svg
            class="w-8 h-8 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 class="text-2xl font-black text-slate-900 mb-2">
          {{ $t('account.email-verification.verified.title') }}
        </h1>
        <p class="text-slate-500 mb-8 leading-relaxed">
          {{ $t('account.email-verification.verified.message') }}
        </p>
        <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 w-full text-left">
          <p class="text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs"
              >1</span
            >
            {{ $t('account.email-verification.verified.step.1') }}
          </p>
          <p class="text-sm font-bold text-slate-700 flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs"
              >2</span
            >
            {{ $t('account.email-verification.verified.step.2') }}
          </p>
        </div>
      </div>

      <div
        v-else-if="status === 'error'"
        class="relative flex flex-col items-center animate-in zoom-in-95 duration-300">
        <div
          class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 border-4 border-red-50">
          <svg class="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 class="text-2xl font-black text-slate-900 mb-2">
          {{ $t('account.email-verification.failure.title') }}
        </h1>
        <p class="text-slate-500 mb-8 leading-relaxed">
          {{ errorMessage }}
        </p>

        <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 w-full text-left">
          <p class="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <span
              class="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs shrink-0"
              >1</span
            >
            {{ $t('account.email-verification.failure.step.1') }}
          </p>
          <p class="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <span
              class="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs shrink-0"
              >2</span
            >
            {{ $t('account.email-verification.failure.step.2') }}
          </p>
          <p class="text-sm font-bold text-slate-700 flex items-center gap-2">
            <span
              class="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs shrink-0"
              >3</span
            >
            {{ $t('account.email-verification.failure.step.3') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { getAuth, applyActionCode } from 'firebase/auth';

// Prevent this page from using any global layouts with navbars/footers
// to keep it hyper-focused on the single task.
definePageMeta({
  layout: false
});

const route = useRoute();
const { t } = useI18n();
const status = ref<'loading' | 'success' | 'error'>('loading');
const errorMessage = ref('');

onMounted(async () => {
  // Firebase appends these exact parameters to the URL
  const actionCode = route.query.oobCode as string;
  const mode = route.query.mode as string;

  // 1. Safety Check
  if (!actionCode || mode !== 'verifyEmail') {
    status.value = 'error';
    errorMessage.value = t('account.email-verification.failure.message.invalid-link');
    return;
  }

  // 2. Execute Verification
  try {
    const auth = getAuth();

    // This is the magic Firebase function that consumes the token
    // and updates the database to emailVerified = true
    await applyActionCode(auth, actionCode);

    status.value = 'success';
  } catch (error: any) {
    status.value = 'error';

    // Simplified error messages since the UI box now handles the "what next" instructions
    switch (error.code) {
      case 'auth/expired-action-code':
        errorMessage.value = t('account.email-verification.failure.message.expired-action-code');
        break;
      case 'auth/invalid-action-code':
        errorMessage.value = t('account.email-verification.failure.message.invalid-action-code');
        break;
      case 'auth/user-disabled':
        errorMessage.value = t('account.email-verification.failure.message.user-disabled');
        break;
      default:
        errorMessage.value = t('account.email-verification.failure.message.default');
    }
  }
});
</script>
