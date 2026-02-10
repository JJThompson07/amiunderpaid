<template>
  <div
    class="flex flex-col gap-4 p-4 border rounded-xl transition-colors relative overflow-hidden"
    :class="[borderColour, bgColour, hoverClass, { 'h-full': fullHeight }]">
    <div
      v-if="premier"
      class="absolute top-0 right-0 px-2 py-1 bg-primary-100 text-2xs font-bold text-primary-600 rounded-bl-lg">
      PREMIER
    </div>
    <div class="flex flex-col gap-4">
      <div class="flex gap-2 items-center">
        <div
          class="w-10 h-10 flex items-center justify-center rounded-full"
          :class="[affiliateBgColour, affiliateTextColour]">
          <component :is="icon" class="w-5 h-5" />
        </div>
        <h4 class="text-lg font-bold text-slate-900">{{ header }}</h4>
      </div>
      <div class="text-xs text-slate-600 flex flex-col gap-2">
        <p>
          <strong>{{ strapline }}</strong>
        </p>
        <p>
          <slot name="body" />
        </p>
        <p v-if="sponsored" class="text-right"><small>(Sponsored)</small></p>
      </div>
    </div>
    <div class="mt-auto">
      <slot name="cta" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  premier: {
    type: Boolean,
    default: false
  },
  borderColour: {
    type: String,
    default: 'border-slate-200'
  },
  bgColour: {
    type: String,
    default: 'bg-slate-50/50'
  },
  hoverClass: {
    type: String,
    default: 'hover:border-slate-300'
  },
  affiliateBgColour: {
    type: String,
    default: 'bg-slate-200'
  },
  affiliateTextColour: {
    type: String,
    default: 'text-slate-600'
  },
  icon: {
    type: [Object, Function],
    required: true
  },
  header: {
    type: String,
    required: true
  },
  strapline: {
    type: String,
    required: true
  },
  sponsored: {
    type: Boolean,
    default: false
  },
  fullHeight: {
    type: Boolean,
    default: false
  }
});
</script>

<style scoped></style>
