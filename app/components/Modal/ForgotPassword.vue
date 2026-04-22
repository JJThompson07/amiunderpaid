<template>
  <ModalGeneric
    :model-value="modelValue"
    title="Reset Password"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="p-6">
      <template v-if="!resetSuccess">
        <p class="text-sm text-slate-500 mb-6">
          Enter your account email address and we will send you a secure link to reset your
          password.
        </p>

        <AmIInputGeneric
          v-model="resetEmail"
          label="Email Address"
          placeholder="you@agency.com"
          :icon="Mail"
          @keyup.enter="submitPasswordReset" />

        <div
          v-if="resetError"
          class="mt-4 text-[11px] font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
          {{ resetError }}
        </div>
      </template>

      <template v-else>
        <div class="text-center py-6">
          <div
            class="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-100">
            <CheckCircle class="w-8 h-8" />
          </div>
          <h4 class="text-lg font-bold text-slate-900 mb-2">Check your inbox</h4>
          <p class="text-sm text-slate-500">
            We've sent a password reset link to <br />
            <span class="font-bold text-slate-900 mt-1 block">{{ resetEmail }}</span>
          </p>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="flex items-center gap-3 w-full justify-end">
        <button
          type="button"
          class="text-sm font-bold text-slate-500 hover:text-slate-700 px-4 py-2 cursor-pointer transition-colors"
          @click="$emit('update:modelValue', false)">
          {{ resetSuccess ? 'Close' : 'Cancel' }}
        </button>

        <AmIButton
          v-if="!resetSuccess"
          title="Send Reset Link"
          :loading="resetLoading"
          class="!py-2 !px-5 text-sm shadow-none"
          @click="submitPasswordReset">
          <div class="flex items-center gap-2">
            <span
              v-if="resetLoading"
              class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>Send Reset Link</span>
          </div>
        </AmIButton>
      </div>
    </template>
  </ModalGeneric>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Mail, CheckCircle } from 'lucide-vue-next';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  initialEmail: {
    type: String,
    default: ''
  }
});

defineEmits(['update:modelValue']);

const { resetPassword } = useRecruiterAuth();

const resetEmail = ref('');
const resetLoading = ref(false);
const resetSuccess = ref(false);
const resetError = ref('');

// Reset the modal state every time it opens!
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      resetEmail.value = props.initialEmail;
      resetSuccess.value = false;
      resetError.value = '';
      resetLoading.value = false;
    }
  }
);

const submitPasswordReset = async () => {
  if (!resetEmail.value) {
    resetError.value = 'Please enter an email address.';
    return;
  }

  resetLoading.value = true;
  resetError.value = '';

  const success = await resetPassword(resetEmail.value);

  if (success) {
    resetSuccess.value = true;
  } else {
    resetError.value = 'Failed to send reset link. Please check the email and try again.';
  }

  resetLoading.value = false;
};
</script>
