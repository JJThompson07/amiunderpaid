<template>
  <div ref="containerRef" class="ami-input relative w-full group">
    <label v-if="label" class="ml-1 text-xs font-bold uppercase tracking-wider text-slate-500">
      {{ label }}<span v-if="optional" class="text-slate-400 text-2xs"> (optional)</span
      ><span v-else class="text-secondary-600">*</span>
    </label>
    <span
      v-if="helper"
      class="ml-1 text-2xs font-semibold text-slate-400 uppercase tracking-normal block sm:inline-block"
      >{{ helper }}</span
    >
    <div class="relative flex">
      <div v-if="icon" class="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <component
          :is="icon"
          class="w-5 h-5 text-slate-400 group-hover:text-primary-500 group-focus-within:text-primary-500 transition-colors" />
      </div>

      <input
        v-model="inputValue"
        type="text"
        :disabled="disabled"
        :placeholder="placeholder"
        autocomplete="off"
        class="w-full pr-4 py-3 font-medium transition-all border bg-slate-50 border-slate-200 focus:outline-none text-slate-900 placeholder:text-slate-400 focus:ring-0 rounded-xl"
        :class="[icon ? 'pl-10' : 'pl-4']"
        @focus="onFocus"
        @input="onInput"
        @keydown.down.prevent="navigateOptions(1)"
        @keydown.up.prevent="navigateOptions(-1)"
        @keydown.enter.prevent="selectActiveOption" />

      <div
        class="absolute right-0 top-0 bottom-0 px-4 text-slate-600 hover:bg-slate-300/50 flex items-center justify-center cursor-pointer transition-all duration-300 ease-in-out rounded-r-xl"
        :class="inputValue.length > 0 ? 'opacity-100' : 'opacity-0'"
        @click="inputValue = ''">
        <XIcon class="h-4 w-4" />
      </div>

      <!-- Loading Indicator -->
      <div v-if="loading" class="absolute right-12 top-1/2 -translate-y-1/2">
        <div
          class="w-4 h-4 border-2 border-slate-200 border-t-primary-500 rounded-full animate-spin"></div>
      </div>

      <!-- Dropdown -->
      <div
        v-if="isOpen && filteredOptions.length > 0"
        class="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 py-1">
        <button
          v-for="(option, index) in filteredOptions"
          :key="option"
          class="w-full text-left px-4 py-2.5 text-sm transition-colors"
          :class="
            activeIndex === index
              ? 'bg-primary-50 text-primary-700 font-medium'
              : 'text-slate-700 hover:bg-slate-50'
          "
          @click="selectOption(option)"
          @mouseenter="activeIndex = index">
          {{ option }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ** imports **
import { ref, computed, watch } from 'vue';
import { onClickOutside } from '@vueuse/core';
import type { Component, PropType } from 'vue';
import { XIcon } from 'lucide-vue-next';

// ** props **
const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  options: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  placeholder: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  helper: {
    type: String,
    default: ''
  },
  icon: {
    // Relaxed type to avoid Vue warnings with functional components
    type: [Object, Function] as PropType<Component>,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  optional: {
    type: Boolean,
    default: false
  },
  preFilteredOptions: {
    type: Boolean,
    default: false
  }
});

// ** emits **
const emit = defineEmits(['update:modelValue']);

// ** data & refs **
const containerRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const inputValue = ref(props.modelValue);
const activeIndex = ref(-1);

// ** computed properties **
const filteredOptions = computed(() => {
  if (!inputValue.value) return [];
  if (props.preFilteredOptions) return props.options;

  const search = inputValue.value.toLowerCase();
  return props.options.filter((opt) => opt.toLowerCase().includes(search)).slice(0, 50);
});

// ** methods **
const selectOption = (option: string) => {
  inputValue.value = option;
  emit('update:modelValue', option);
  isOpen.value = false;
  activeIndex.value = -1;
};

const onInput = () => {
  isOpen.value = true;
  activeIndex.value = -1;
  emit('update:modelValue', inputValue.value);
};

const onFocus = () => {
  if (inputValue.value) isOpen.value = true;
};

const navigateOptions = (direction: number) => {
  if (!isOpen.value || filteredOptions.value.length === 0) return;

  const max = filteredOptions.value.length - 1;
  let next = activeIndex.value + direction;

  if (next > max) next = 0;
  if (next < 0) next = max;

  activeIndex.value = next;
};

const selectActiveOption = () => {
  if (isOpen.value && activeIndex.value >= 0 && filteredOptions.value[activeIndex.value]) {
    selectOption(filteredOptions.value[activeIndex.value]!);
  } else {
    isOpen.value = false;
  }
};

// ** watchers **
// Close dropdown when clicking outside
onClickOutside(containerRef, () => {
  isOpen.value = false;
});

// Sync internal value with prop
watch(
  () => props.modelValue,
  (newVal) => {
    inputValue.value = newVal;
  }
);
</script>
