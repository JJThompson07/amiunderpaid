<template>
  <ModalGeneric
    :model-value="modelValue"
    title="Request Partner Access"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="p-6 space-y-4">
      <p class="text-sm text-slate-500">
        Submit your agency details below. Our administrative team will review your application and
        send an invite email with login credentials upon approval.
      </p>

      <AmIInputGeneric
        v-model="agencyName"
        label="Agency Name"
        placeholder="e.g. Acme Recruitment Ltd"
        :icon="Building2" />

      <AmIInputGeneric
        v-model="email"
        label="Email Address"
        placeholder="e.g. partner@acme.com"
        :icon="Mail"
        @keyup.enter="submitRequest" />
    </div>

    <template #footer>
      <div class="flex items-center gap-3 w-full justify-end">
        <button
          type="button"
          class="text-sm font-bold text-slate-500 hover:text-slate-700 px-4 py-2 cursor-pointer transition-colors"
          @click="$emit('update:modelValue', false)">
          Cancel
        </button>

        <AmIButton
          title="Submit Request"
          :loading="loading"
          class="py-2! px-5! text-sm shadow-none"
          @click="submitRequest">
          <div class="flex items-center gap-2">
            <span
              v-if="loading"
              class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>Submit Request</span>
          </div>
        </AmIButton>
      </div>
    </template>
  </ModalGeneric>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Building2, Mail } from 'lucide-vue-next';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

const { showToast } = useSystemToast();

const agencyName = ref('');
const email = ref('');
const loading = ref(false);

// Reset fields when opening
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      agencyName.value = '';
      email.value = '';
      loading.value = false;
    }
  }
);

const submitRequest = async () => {
  if (!agencyName.value.trim() || !email.value.trim()) {
    showToast('Missing Fields', 'Please provide both your agency name and email address.', 'error');
    return;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value.trim())) {
    showToast('Invalid Email', 'Please enter a valid email address.', 'error');
    return;
  }

  loading.value = true;

  try {
    const response = await $fetch<{ success: boolean; message?: string }>(
      '/api/user/recruiter/request-access',
      {
        method: 'POST',
        body: {
          agencyName: agencyName.value.trim(),
          email: email.value.trim().toLowerCase()
        }
      }
    );

    if (response.success) {
      showToast('Request Submitted', 'Your access request has been sent successfully.', 'success');
      emit('update:modelValue', false);
    } else {
      showToast(
        'Submission Failed',
        response.message || 'There was an error submitting your request. Please try again.',
        'error'
      );
    }
  } catch (err: any) {
    const errMsg = err.data?.message || 'Failed to submit request. Please try again later.';
    showToast('Error', errMsg, 'error');
  } finally {
    loading.value = false;
  }
};
</script>
