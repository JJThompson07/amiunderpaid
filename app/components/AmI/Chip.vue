<template>
  <div
    class="chip inline-flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase rounded-full tracking-tighter"
    :class="[bgColour, textColour]">
    <component :is="icon" v-if="icon" class="w-4 h-4" />
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps({
  icon: {
    type: [Object, Function] as PropType<Component>,
    default: null,
  },
  bgColour: {
    type: String,
    default: 'bg-positive-100',
  },
  textColour: {
    type: String,
    default: 'text-slate-800',
  },
});
</script>

<style scoped></style>
