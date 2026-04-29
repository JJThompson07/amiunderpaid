<template>
  <button
    class="px-6 py-3 rounded-2xl font-bold shadow-lg transition-transform hover:scale-110 flex items-center gap-2 z-50"
    :style="{ backgroundColor: bgColour || '#4f46e5', color: textColour || '#ffffff' }"
    @click="$emit('click')">
    <slot>{{ text || 'Contact Us' }}</slot>
  </button>
</template>

<script setup lang="ts">
defineProps({
  text: { type: String, default: '' },
  bgColour: { type: String, default: '#4f46e5' },
  textColour: { type: String, default: '#ffffff' }
});

defineEmits(['click']);
</script>
