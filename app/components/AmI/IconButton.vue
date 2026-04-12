<template>
  <button
    :title="title"
    :disabled="disabled || loading"
    class="p-2 rounded-lg transition-all duration-200 flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
    :class="[bgColour, bgHoverColour, textColour, textHoverColour]"
    @click="$emit('click', $event)">
    <span
      v-if="loading"
      class="w-4 h-4 border-2 rounded-full animate-spin block"
      :class="spinnerColour">
    </span>

    <slot v-else />
  </button>
</template>

<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true
  },
  bgColour: {
    type: String,
    default: 'bg-transparent'
  },
  bgHoverColour: {
    type: String,
    default: 'hover:bg-slate-100'
  },
  textColour: {
    type: String,
    default: 'text-slate-400'
  },
  textHoverColour: {
    type: String,
    default: ''
  },
  spinnerColour: {
    type: String,
    default: 'border-slate-500/30 border-t-slate-500'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['click']);
</script>
