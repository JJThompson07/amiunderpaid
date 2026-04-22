<template>
  <ModalGeneric
    :model-value="modelValue"
    title="Reset Password"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="p-6">
      <p class="text-sm text-slate-500 mb-6">
        {{ $t('account.forgot-password.description') }}
      </p>

      <AmIInputGeneric
        v-model="resetEmail"
        label="Email Address"
        placeholder="you@agency.com"
        :icon="Mail"
        @keyup.enter="submitPasswordReset" />
    </div>

    <template #footer>
      <div class="flex items-center gap-3 w-full justify-end">
        <button
          type="button"
          class="text-sm font-bold text-slate-500 hover:text-slate-700 px-4 py-2 cursor-pointer transition-colors"
          @click="$emit('update:modelValue', false)">
          {{ $t('common.cancel') }}
        </button>

        <AmIButton
          title="Send Reset Link"
          :loading="resetLoading"
          class="py-2! px-5! text-sm shadow-none"
          @click="submitPasswordReset">
          <div class="flex items-center gap-2">
            <span
              v-if="resetLoading"
              class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>{{ $t('account.forgot-password.action.send-link') }}</span>
          </div>
        </AmIButton>
      </div>
    </template>
  </ModalGeneric>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Mail } from 'lucide-vue-next'; // Removed CheckCircle as it's no longer needed

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

const emit = defineEmits(['update:modelValue']);

const { resetPassword } = useRecruiterAuth();
const { showToast } = useSystemToast();
const { t } = useI18n();

const resetEmail = ref('');
const resetLoading = ref(false);

// Reset the modal state every time it opens
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      resetEmail.value = props.initialEmail;
      resetLoading.value = false;
    }
  }
);

const submitPasswordReset = async () => {
  if (!resetEmail.value) {
    showToast(
      t('account.forgot-password.email-required.title'),
      t('account.forgot-password.email-required.message'),
      'error'
    );
    return;
  }

  resetLoading.value = true;

  const success = await resetPassword(resetEmail.value);

  if (success) {
    // Show the success toast and automatically close the modal
    showToast(
      t('account.forgot-password.success.title'),
      t('account.forgot-password.success.message', { email: resetEmail.value }),
      'success'
    );
    emit('update:modelValue', false);
  } else {
    showToast(
      t('account.forgot-password.reset-failed.title'),
      t('account.forgot-password.reset-failed.message'),
      'error'
    );
  }

  resetLoading.value = false;
};
</script>
