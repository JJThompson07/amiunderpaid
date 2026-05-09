<template>
  <ModalGeneric
    :model-value="modelValue"
    title="Cancel Territory"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="p-6">
      <div class="flex items-start gap-4 text-left">
        <div
          class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-6 h-6 text-red-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <div>
          <h4 class="text-lg font-bold text-slate-800 mb-2">Are you absolutely sure?</h4>
          <p class="text-slate-500 text-sm leading-relaxed mb-4">
            You are about to cancel your active plan for this territory. You will lose access to its
            leads at the end of your current billing cycle, and you will not be billed for it again.
          </p>
          <p
            class="text-red-500 text-xs font-bold uppercase tracking-wider bg-red-50 px-2 py-1 rounded inline-block">
            This action cannot be undone.
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center gap-3 w-full justify-end">
        <button
          class="text-sm font-bold text-slate-500 hover:text-slate-700 px-4 py-2 transition-colors disabled:opacity-50"
          :disabled="isCancelling"
          @click="$emit('update:modelValue', false)">
          Nevermind
        </button>

        <AmIButton
          title="Confirm Cancel"
          :disabled="isCancelling"
          bg-colour="bg-red-600"
          text-colour="text-white"
          animation-colour="bg-red-500"
          class="!py-2 !px-4 text-sm shadow-none"
          @click="$emit('confirm')">
          <div class="flex items-center gap-2">
            <span
              v-if="isCancelling"
              class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>{{ isCancelling ? 'Cancelling...' : 'Yes, Cancel Territory' }}</span>
          </div>
        </AmIButton>
      </div>
    </template>
  </ModalGeneric>
</template>

<script setup lang="ts">
defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  isCancelling: {
    type: Boolean,
    default: false
  }
});

defineEmits(['update:modelValue', 'confirm']);
</script>
