<template>
  <div class="ami-input relative w-full group">
    <label v-if="label" class="ml-1 text-xs font-bold uppercase tracking-wider text-slate-500">
      {{ label }} <span v-if="optional" class="text-slate-400 text-2xs">(optional)</span>
    </label>
    <div class="relative flex">
      <div v-if="icon" class="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <component
          :is="icon"
          class="w-5 h-5 text-slate-400 group-hover:text-primary-500 group-focus-within:text-primary-500 transition-colors" />
      </div>
      <input
        v-model="value"
        :type="type"
        :disabled="disabled"
        :placeholder="placeholder"
        :step="step"
        class="w-full pl-10 pr-4 py-3 font-medium transition-all border bg-slate-50 border-slate-200 focus:outline-none text-slate-900 placeholder:text-slate-400"
        :class="param ? 'rounded-l-xl' : 'rounded-xl'" />
      <div v-if="param" class="relative">
        <select
          v-model="param"
          class="h-full py-0 px-4 font-medium transition-colors border-0 border-l cursor-pointer rounded-r-xl bg-slate-100 text-slate-500 sm:text-sm border-slate-200 hover:bg-slate-200 hover:outline-0"
          :disabled="paramsDisabled">
          <option v-for="p in params" :key="p.value" :value="p.value">{{ p.label }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component, PropType } from 'vue';

export interface SelectOption {
  label: string;
  value: string | number;
}

const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true
  },
  placeholder: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  icon: {
    type: [Object, Function] as PropType<Component>,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  },
  paramValue: {
    type: [String, Number],
    default: null
  },
  params: {
    type: Array as PropType<SelectOption[]>,
    default: () => []
  },
  type: {
    type: String,
    default: 'text'
  },
  paramsDisabled: {
    type: Boolean,
    default: false
  },
  optional: {
    type: Boolean,
    default: false
  },
  step: {
    type: Number,
    default: undefined
  }
});

const emit = defineEmits(['update:modelValue', 'update:paramValue']);

const value = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const param = computed({
  get: () => props.paramValue,
  set: (val) => emit('update:paramValue', val)
});
</script>

<style scoped></style>
