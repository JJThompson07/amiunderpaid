<template>
  <div class="ami-input relative w-full">
    <label v-if="label" class="ml-1 text-xs font-bold uppercase tracking-wider text-slate-500">
      {{ label }}
    </label>
    <div class="relative flex">
      <component
        :is="icon"
        v-if="icon"
        class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
      <input
        v-model="value"
        type="text"
        :disabled="disabled"
        :placeholder="placeholder"
        class="w-full pl-10 pr-4 py-3 font-medium transition-all border bg-slate-50 border-slate-200 focus:outline-none text-slate-900 placeholder:text-slate-400"
        :class="param ? 'rounded-l-xl' : 'rounded-xl'" />
      <div v-if="param" class="relative">
        <select
          v-model="param"
          class="h-full py-0 pl-3 font-medium transition-colors border-0 border-l cursor-pointer rounded-r-xl bg-slate-100 pr-7 text-slate-500 sm:text-sm border-slate-200 hover:bg-slate-200 hover:outline-0">
          <option v-for="p in params" :key="p.value" :value="p.value">{{ p.label }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component, PropType } from 'vue'
import type { SelectOption } from '../SalarySearch.vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true,
  },
  placeholder: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  icon: {
    type: Object as PropType<Component>,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  paramValue: {
    type: [String, Number],
    default: null,
  },
  params: {
    type: Array as PropType<SelectOption[]>,
  },
})

const emit = defineEmits(['update:modelValue', 'update:paramValue'])

const value = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const param = computed({
  get: () => props.paramValue,
  set: (val) => emit('update:paramValue', val),
})
</script>

<style scoped></style>
