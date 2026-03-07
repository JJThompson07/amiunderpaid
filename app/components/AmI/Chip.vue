<template>
  <div
    class="chip inline-flex items-center gap-2 uppercase rounded-full tracking-tighter"
    :class="[bgColour, textColour, textSize, font, compact ? 'px-2 py-1' : 'px-4 py-2']">
    <div v-if="icon" class="flex shrink-0">
      <component :is="icon" class="w-3 h-3" />
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
  },
  textSize: {
    type: String,
    default: 'text-sm'
  },
  font: {
    type: String,
    default: 'font-bold'
  },
  compact: {
    type: Boolean,
    default: false
  }
});
</script>
