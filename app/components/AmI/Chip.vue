<template>
  <div
    class="chip inline-flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase rounded-full tracking-tighter"
    :class="[bgColour, textColour]">
    <div v-if="icon" class="flex shrink-0">
      <component :is="icon" class="w-4 h-4" />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { Component, PropType } from 'vue';

defineProps({
  icon: {
    type: [Object, Function] as PropType<Component>,
    default: null
  },
  bgColour: {
    type: String,
    default: 'bg-positive-100'
  },
  textColour: {
    type: String,
    default: 'text-slate-800'
  }
});
</script>

<style scoped></style>
