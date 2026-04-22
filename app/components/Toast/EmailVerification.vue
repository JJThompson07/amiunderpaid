<template>
  <ToastGeneric
    v-model="showVerificationToast"
    :duration="0"
    full-width
    bg-classes="bg-warning-50 border-warning-200">
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div class="flex items-start gap-4">
        <div
          class="w-12 h-12 rounded-2xl bg-warning-100 flex items-center justify-center shrink-0 border border-warning-200/50">
          <Mail class="w-6 h-6 text-warning-600" />
        </div>
        <div>
          <h3 class="text-base font-bold text-warning-900">{{ $t('toast.verify-email.title') }}</h3>
          <p class="text-sm text-warning-700 mt-1 max-w-xl leading-relaxed">
            {{ $t('toast.verify-email.message') }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto shrink-0">
        <button
          class="text-sm font-bold text-warning-700 hover:text-warning-900 transition-colors px-2 py-2"
          @click="refreshVerificationStatus">
          {{ $t('toast.verify-email.action.already-done') }}
        </button>
        <AmIButton
          title="Resend Email"
          bg-colour="bg-warning-600"
          text-colour="text-white"
          animation-colour="bg-warning-700"
          class="py-2.5! px-5! text-sm shadow-none w-full md:w-auto"
          @click="handleResend">
          {{ $t('toast.verify-email.action.resend') }}
        </AmIButton>
      </div>
    </div>
  </ToastGeneric>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { Mail } from 'lucide-vue-next';

const { resendVerificationEmail } = useRecruiterAuth();
const firebaseAuth = useFirebaseAuth();
const { showToast } = useSystemToast();
const { t } = useI18n();

const showVerificationToast = ref(false);

watchEffect(() => {
  if (firebaseAuth?.currentUser) {
    showVerificationToast.value = !firebaseAuth.currentUser.emailVerified;
  } else {
    showVerificationToast.value = false;
  }
});

const handleResend = async () => {
  const success = await resendVerificationEmail();
  if (success) {
    showToast(t('toast.type.success'), t('toast.verify-email.action.sent'), 'success');
  }
};

const refreshVerificationStatus = async () => {
  if (firebaseAuth?.currentUser) {
    await firebaseAuth.currentUser.reload();

    const isVerified = firebaseAuth.currentUser.emailVerified;

    if (!isVerified) {
      showToast(t('toast.type.error'), t('toast.verify-email.action.error'), 'error');
    }
  }
};
</script>
