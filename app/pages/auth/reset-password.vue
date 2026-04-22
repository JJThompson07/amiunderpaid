<template>
  <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-black text-slate-900 mb-2">
          {{ $t('account.reset-password.title') }}
        </h1>
        <p class="text-slate-500">{{ $t('account.reset-password.helper') }}</p>
      </div>

      <div
        v-if="error"
        class="mb-6 p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-200">
        {{ error }}
      </div>

      <div v-if="success" class="text-center animate-in zoom-in-95 duration-300">
        <div
          class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-50">
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
        <p class="text-slate-700 font-bold mb-6">
          {{ $t('account.reset-password.success.title') }}
        </p>
        <AmIButton title="Go to Login" class="w-full" @click="navigateTo('/recruiter/login')">
          {{ $t('account.reset-password.success.action.recruiter') }}
        </AmIButton>
      </div>

      <form v-else class="space-y-4" @submit.prevent="handleReset">
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-1">
            {{ $t('account.form.new-password') }}
          </label>
          <input
            v-model="newPassword"
            type="password"
            required
            minlength="6"
            class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
            placeholder="••••••••" />
        </div>

        <AmIButton
          title="Save Password"
          type="submit"
          class="w-full mt-4"
          :disabled="loading || !newPassword">
          <span v-if="loading">{{ $t('common.saved.saving') }}</span>
          <span v-else>{{ $t('account.form.save-password') }}</span>
        </AmIButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { getAuth, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';

definePageMeta({
  layout: false
});

const route = useRoute();
const { t } = useI18n();
const actionCode = ref('');
const newPassword = ref('');
const error = ref('');
const loading = ref(false);
const success = ref(false);

onMounted(async () => {
  const code = route.query.oobCode as string;

  if (!code) {
    error.value = t('account.reset-password.error.invalid');
    return;
  }

  actionCode.value = code;

  // Optional but recommended: Verify the code is still valid before they even try to type a password
  try {
    const auth = getAuth();
    await verifyPasswordResetCode(auth, actionCode.value);
  } catch {
    error.value = t('account.reset-password.error.expired');
  }
});

const handleReset = async () => {
  if (newPassword.value.length < 6) {
    error.value = t('account.reset-password.error.length');
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const auth = getAuth();
    // This function actually updates the user's password in Firebase!
    await confirmPasswordReset(auth, actionCode.value, newPassword.value);
    success.value = true;
  } catch {
    error.value = t('account.reset-password.error.default');
  } finally {
    loading.value = false;
  }
};
</script>
