<template>
  <div class="ami-tabs relative group flex flex-col gap-1">
    <label v-if="label" class="ml-1 text-xs font-bold uppercase tracking-wider text-slate-500">
      {{ label }}
    </label>
    <div
      class="inline-flex p-1 backdrop-blur-md border border-white/10 shadow-lg"
      :class="[bgColour, round ? 'rounded-2xl' : 'rounded-xl']">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="px-6 py-3 text-xs font-bold rounded-lg transition-all duration-500 ease-in-out flex-1"
        :class="[
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          value === option.value
            ? [buttonColour, buttonTextColour, 'shadow-md']
            : [textColour, hoverColour],
          round ? 'rounded-xl' : 'rounded-lg',
          wrap ? 'flex-wrap' : 'whitespace-nowrap'
        ]"
        @click="value = option.value">
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface TabOption {
  label: string;
  value: string | number;
}

const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true
  },
  label: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  options: {
    type: Array as PropType<TabOption[]>,
    default: () => []
  },
  bgColour: {
    type: String,
    default: 'bg-secondary-900/50'
  },
  textColour: {
    type: String,
    default: 'text-secondary-200'
  },
  hoverColour: {
    type: String,
    default: 'hover:text-white'
  },
  buttonColour: {
    type: String,
    default: 'bg-white'
  },
  buttonTextColour: {
    type: String,
    default: 'text-secondary-900'
  },
  round: {
    type: Boolean,
    default: false
  },
  wrap: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

const value = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});
</script>

<style scoped></style>
