<template>
  <div
    ref="button"
    class="relative overflow-hidden rounded-lg px-4 py-2 select-none transition-all duration-700 ease-in-out font-bold"
    :class="[
      backgroundColour,
      loading ? 'cursor-wait' : 'cursor-pointer',
      textColour,
      { 'pointer-events-none': disabled },
      { 'whitespace-nowrap': !wrap }
    ]">
    <section class="relative z-10 flex h-full flex-col rounded-md">
      <slot />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useElementHover } from '@vueuse/core';

const props = defineProps({
  bgColour: {
    type: String,
    default: 'bg-primary-500'
  },
  textColour: {
    type: String,
    default: 'text-white'
  },
  animationColour: {
    type: String,
    default: 'bg-primary-400'
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  wrap: {
    type: Boolean,
    default: false
  }
});

// ** Data & Refs **
const button = ref<HTMLElement | null>(null);
const isHovered = useElementHover(button);

const backgroundColour = computed<string>(() => {
  if (props.disabled) {
    return 'bg-slate-400 cursor-not-allowed';
  }
  if (props.loading) {
    return 'bg-slate-400 cursor-wait';
  }
  return isHovered.value ? props.animationColour : props.bgColour;
});
</script>

<style scoped></style>
