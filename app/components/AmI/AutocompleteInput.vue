<template>
  <div ref="containerRef" class="ami-input relative w-full group">
    <label v-if="label" class="ml-1 text-xs font-bold uppercase tracking-wider text-slate-500">
      {{ label }}
    </label>
    <div class="relative flex">
      <component
        :is="icon"
        v-if="icon"
        class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-primary-500 group-focus-within:text-primary-500 transition-colors z-10" />

      <input
        v-model="inputValue"
        type="text"
        :disabled="disabled"
        :placeholder="placeholder"
        autocomplete="off"
        class="w-full pr-4 py-3 font-medium transition-all border bg-slate-50 border-slate-200 focus:outline-none text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl"
        :class="[icon ? 'pl-10' : 'pl-4']"
        @focus="onFocus"
        @input="onInput"
        @keydown.down.prevent="navigateOptions(1)"
        @keydown.up.prevent="navigateOptions(-1)"
        @keydown.enter.prevent="selectActiveOption" />

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
              ? 'bg-indigo-50 text-indigo-700 font-medium'
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

// ** props **
const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  options: {
    type: Array as PropType<string[]>,
    default: () => [],
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
    // Relaxed type to avoid Vue warnings with functional components
    type: [Object, Function] as PropType<Component>,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

// ** emits **
const emit = defineEmits(['update:modelValue']);

// ** data & refs **
const containerRef = ref(null);
const isOpen = ref(false);
const inputValue = ref(props.modelValue);
const activeIndex = ref(-1);

// ** computed properties **
const filteredOptions = computed(() => {
  if (!inputValue.value) return [];
  const search = inputValue.value.toLowerCase();
  return props.options
    .filter((opt) => opt.toLowerCase().includes(search) && opt.toLowerCase() !== search)
    .slice(0, 6);
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
