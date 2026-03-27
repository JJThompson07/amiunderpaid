<template>
  <div ref="containerRef" class="ami-input-select relative w-full group">
    <label v-if="label" class="ml-1 text-xs font-bold uppercase tracking-wider text-slate-500">
      {{ label }}
      <span v-if="optional" class="text-slate-400 text-2xs uppercase">
        ({{ $t('common.optional') }})
      </span>
      <span v-else class="text-secondary-600">*</span>
    </label>

    <span
      v-if="helper"
      class="ml-1 text-2xs font-semibold text-slate-400 uppercase tracking-normal block sm:inline-block">
      {{ helper }}
    </span>

    <div class="relative flex mt-1">
      <div v-if="icon" class="absolute left-3 top-3 z-10 pointer-events-none">
        <component
          :is="icon"
          class="w-5 h-5 text-slate-400 group-hover:text-primary-500 group-focus-within:text-primary-500 transition-colors" />
      </div>

      <div
        class="w-full min-h-13 p-2 flex flex-wrap items-center transition-all border bg-slate-50 rounded-xl cursor-text relative pr-10"
        :class="[
          icon ? 'pl-10' : 'pl-3',
          isOpen
            ? 'border-primary-500 ring-2 ring-primary-500/20 bg-white'
            : 'border-slate-200 hover:border-slate-300',
          disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''
        ]"
        @click="onFocusContainer">
        <div
          v-if="!externalList && modelValue.length"
          class="flex flex-wrap items-center gap-1.5 mr-1">
          <span
            v-for="val in modelValue"
            :key="val"
            class="bg-primary-50 text-primary-700 border border-primary-100 rounded-lg flex items-center gap-1 px-2.5 py-1 text-sm font-bold shadow-xs whitespace-nowrap">
            {{ getLabelForValue(val) }}
            <button
              type="button"
              class="text-primary-400 hover:text-negative-500 transition-colors ml-1 focus:outline-none"
              @click.stop="removeOption(val)">
              <X class="h-3.5 w-3.5" />
            </button>
          </span>
        </div>

        <div v-if="externalList && modelValue.length" class="mr-2">
          <span class="text-primary-700 flex items-center gap-1 px-2.5 py-1 text-sm font-bold">
            {{ $t('common.items.selected', { count: modelValue.length }) }}
          </span>
        </div>

        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          :disabled="disabled"
          :placeholder="showPlaceholder ? placeholder : ''"
          autocomplete="off"
          class="flex-1 bg-transparent font-medium border-none focus:outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400 p-1 text-sm transition-all duration-200"
          :class="[
            !isOpen && modelValue.length > 0
              ? 'w-0 min-w-0 p-0 opacity-0 absolute'
              : 'min-w-30 opacity-100 relative'
          ]"
          @focus="isOpen = true"
          @keydown.down.prevent="navigateOptions(1)"
          @keydown.up.prevent="navigateOptions(-1)"
          @keydown.enter.prevent="selectActiveOption"
          @keydown.delete="handleBackspace" />

        <div
          v-if="modelValue.length > 0 && !disabled"
          class="absolute right-0 top-0 bottom-0 px-3 text-slate-400 hover:text-negative-500 flex items-center justify-center cursor-pointer transition-colors z-10"
          @click.stop="clearAll">
          <X class="h-4 w-4" />
        </div>

        <div v-if="loading" class="absolute right-10 top-1/2 -translate-y-1/2 z-10">
          <div
            class="w-4 h-4 border-2 border-slate-200 border-t-primary-500 rounded-full animate-spin"></div>
        </div>
      </div>

      <div
        v-if="isOpen && filteredOptions.length > 0"
        class="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 py-1.5 custom-scrollbar">
        <button
          v-for="(option, index) in filteredOptions"
          :key="option.value"
          type="button"
          class="w-full text-left px-4 py-2.5 text-sm transition-colors flex justify-between items-center"
          :class="[
            activeIndex === index
              ? 'bg-primary-50 text-primary-700 font-medium'
              : 'text-slate-700 hover:bg-slate-50',
            modelValue.includes(option.value) ? 'bg-slate-50' : ''
          ]"
          @click.stop="toggleOption(option)"
          @mouseenter="activeIndex = index">
          <span :class="modelValue.includes(option.value) ? 'font-bold text-primary-600' : ''">
            {{ option.label }}
          </span>

          <svg
            v-if="modelValue.includes(option.value)"
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 text-primary-600"
            viewBox="0 0 20 20"
            fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <div
        v-else-if="isOpen && searchQuery && filteredOptions.length === 0"
        class="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4 text-center text-sm text-slate-500 font-medium">
        {{ $t('common.items.none-found', { search: searchQuery }) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onClickOutside, useFocus } from '@vueuse/core';
import type { Component, PropType } from 'vue';
import { X } from 'lucide-vue-next';

export type AutocompleteOption = {
  value: string;
  label: string;
};

const props = defineProps({
  modelValue: {
    type: Array as PropType<string[]>,
    required: true
  },
  options: {
    type: Array as PropType<AutocompleteOption[]>,
    default: () => []
  },
  single: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
  label: { type: String, default: '' },
  helper: { type: String, default: '' },
  icon: { type: [Object, Function] as PropType<Component>, default: null },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  optional: { type: Boolean, default: false },
  externalList: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue']);

// Refs
const containerRef = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const isOpen = ref(false);
const searchQuery = ref('');
const activeIndex = ref(-1);

// VueUse reactive focus!
const { focused } = useFocus(searchInput);

// Helpers
const getLabelForValue = (val: string) => {
  const found = props.options.find((opt) => opt.value === val);
  return found ? found.label : val;
};

// Computed
const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options;
  const search = searchQuery.value.toLowerCase();
  return props.options.filter((opt) => opt.label.toLowerCase().includes(search));
});

const showPlaceholder = computed(() => {
  return (
    props.modelValue.length === 0 || (props.single && isOpen.value && props.modelValue.length === 0)
  );
});

// Methods
const onFocusContainer = () => {
  if (props.disabled) return;
  isOpen.value = true;
  focused.value = true; // Automatically handles the DOM focus
};

const toggleOption = (option: AutocompleteOption) => {
  let newValue: string[];

  // Handle single vs multi selection logic
  if (props.single) {
    newValue = props.modelValue.includes(option.value) ? [] : [option.value];
    isOpen.value = false; // Auto-close dropdown on single selection
  } else {
    newValue = [...props.modelValue];
    const index = newValue.indexOf(option.value);
    if (index > -1) {
      newValue.splice(index, 1); // Remove
    } else {
      newValue.push(option.value); // Add
    }
    focused.value = true; // Keep focus for rapid multi-selection
  }

  emit('update:modelValue', newValue);
  searchQuery.value = ''; // Clear search text
};

const removeOption = (val: string) => {
  const newValue = props.modelValue.filter((v) => v !== val);
  emit('update:modelValue', newValue);
};

const clearAll = () => {
  emit('update:modelValue', []);
  searchQuery.value = '';
  isOpen.value = false;
};

// Keyboard Navigation
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
    toggleOption(filteredOptions.value[activeIndex.value]!);
  }
};

const handleBackspace = () => {
  // If search is empty, delete the last selected pill
  if (searchQuery.value === '' && props.modelValue.length > 0) {
    const newValue = [...props.modelValue];
    newValue.pop();
    emit('update:modelValue', newValue);
  }
};

// Close dropdown when clicking outside
onClickOutside(containerRef, () => {
  isOpen.value = false;
  searchQuery.value = ''; // Clear search when they click away
  activeIndex.value = -1;
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
}
</style>
