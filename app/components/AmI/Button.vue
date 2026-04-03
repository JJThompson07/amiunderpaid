<template>
  <div
    ref="button"
    class="relative overflow-hidden rounded-lg select-none transition-all duration-700 ease-in-out font-bold text-center shadow-md"
    :class="[
      backgroundColour,
      !disabled ? (loading ? 'cursor-wait' : 'cursor-pointer') : 'cursor-not-allowed',
      textColour,
      { 'whitespace-nowrap': !wrap },
      equalPadding ? 'p-2' : 'px-4 py-2'
    ]"
    role="button"
    :disabled="disabled"
    :title="title"
    @click="handleClick">
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
  },
  title: {
    type: String,
    default: ''
  },
  equalPadding: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click']);

// ** Data & Refs **
const button = ref<HTMLElement | null>(null);
const isHovered = useElementHover(button);

const backgroundColour = computed<string>(() => {
  if (props.disabled) {
    return 'bg-slate-400 opacity-50';
  }
  if (props.loading) {
    return 'bg-slate-400';
  }
  return isHovered.value ? props.animationColour : props.bgColour;
});

const handleClick = (event: Event) => {
  // Completely block the click event from firing if disabled
  if (props.disabled) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  emit('click', event);
};
</script>

<style scoped></style>
