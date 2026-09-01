<template>
  <div class="w-full flex items-center gap-3">
    <span class="text-xs font-bold text-slate-600 whitespace-nowrap">{{ fromLabel }}</span>

    <div class="ami-range-slider relative flex-1 h-5 min-w-30">
      <div class="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
      <div
        class="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary-500"
        :style="trackFillStyle" />

      <input
        v-model.number="fromIndex"
        type="range"
        min="0"
        :max="maxIndex"
        step="1"
        :aria-label="fromAriaLabel"
        :aria-valuetext="fromLabel"
        class="ami-range-slider-input" />
      <input
        v-model.number="toIndex"
        type="range"
        min="0"
        :max="maxIndex"
        step="1"
        :aria-label="toAriaLabel"
        :aria-valuetext="toLabel"
        class="ami-range-slider-input ami-range-slider-input--top" />
    </div>

    <span class="text-xs font-bold text-slate-600 whitespace-nowrap">{{ toLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: [number, number];
  labels: string[];
  fromAriaLabel?: string;
  toAriaLabel?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: [number, number]): void;
}>();

// steps.length - 1, floored at 0 so a single- (or zero-) month dataset never
// produces a negative max for the native range inputs.
const maxIndex = computed<number>(() => Math.max(0, props.labels.length - 1));

// Clamped the same way in both directions -- "from" can never be dragged
// past "to" and vice versa -- so the two handles can never cross.
const fromIndex = computed<number>({
  get: () => props.modelValue[0],
  set: (value) =>
    emit('update:modelValue', [Math.min(value, props.modelValue[1]), props.modelValue[1]])
});

const toIndex = computed<number>({
  get: () => props.modelValue[1],
  set: (value) =>
    emit('update:modelValue', [props.modelValue[0], Math.max(value, props.modelValue[0])])
});

const fromLabel = computed<string>(() => props.labels[fromIndex.value] ?? '');
const toLabel = computed<string>(() => props.labels[toIndex.value] ?? '');

// Positions the filled-track segment between the two handles as percentages
// of the full step range -- native range inputs give us no built-in way to
// visually connect two independent thumbs into one "selected span" track.
const trackFillStyle = computed<{ left: string; width: string }>(() => {
  const max = maxIndex.value || 1;
  const left = (fromIndex.value / max) * 100;
  const right = (toIndex.value / max) * 100;
  return { left: `${left}%`, width: `${Math.max(0, right - left)}%` };
});
</script>

<style scoped>
/* Two native range inputs stacked exactly on top of each other, each
   controlling one handle. Tailwind utilities can't reach the
   ::-webkit-slider-thumb / ::-moz-range-thumb pseudo-elements, so this needs
   real CSS (same escape hatch CODE_STANDARDS.md already carves out for
   ECharts/custom-scrollbar overrides). pointer-events is off on the input
   itself and back on for just its thumb, so only the two small handles are
   draggable -- clicks anywhere else on the track pass through to whichever
   input is underneath instead of jumping that input's whole value to the
   click position. */
.ami-range-slider-input {
  position: absolute;
  inset: 0;
  width: 100%;
  margin: 0;
  appearance: none;
  background: transparent;
  pointer-events: none;
}

.ami-range-slider-input--top {
  z-index: 2;
}

.ami-range-slider-input::-webkit-slider-runnable-track {
  appearance: none;
  background: transparent;
}

.ami-range-slider-input::-moz-range-track {
  background: transparent;
  border: none;
}

.ami-range-slider-input::-webkit-slider-thumb {
  appearance: none;
  pointer-events: auto;
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  background: var(--color-primary-500);
  border: 2px solid white;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
  cursor: pointer;
}

.ami-range-slider-input::-moz-range-thumb {
  pointer-events: auto;
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  background: var(--color-primary-500);
  border: 2px solid white;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
  cursor: pointer;
}
</style>
