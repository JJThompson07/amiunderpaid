<template>
  <div
    class="ami-button-list flex flex-col gap-2 overflow-y-auto custom-scrollbar"
    :class="[maxHeight]">
    <div
      v-for="option in filteredOptions"
      :key="option.value"
      class="flex items-center justify-between p-2.5 border rounded-lg shadow-xs group"
      :class="[bgColour, borderColour]">
      <div class="flex items-center gap-2 overflow-hidden">
        <div class="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0"></div>
        <span class="font-bold text-xs truncate" :class="[textColour]">
          {{ option.label }}
        </span>
      </div>
      <button
        class="text-slate-400 hover:text-negative-500 p-1 rounded hover:bg-negative-50 transition-colors shrink-0"
        title="Remove"
        @click="$emit('remove', option.value)">
        <XIcon class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { XIcon } from 'lucide-vue-next';

type ButtonListOption = {
  label: string;
  value: string | number;
};

const props = defineProps({
  options: {
    type: Array as PropType<ButtonListOption[]>,
    required: true
  },
  selectedOptions: {
    type: Array as PropType<string[] | { name: string; id: number }[]>,
    required: true
  },
  bgColour: {
    type: String,
    default: 'bg-primary-50'
  },
  textColour: {
    type: String,
    default: 'text-primary-700'
  },
  borderColour: {
    type: String,
    default: 'border-primary-200'
  },
  hoverColour: {
    type: String,
    default: 'hover:bg-primary-100'
  },
  maxHeight: {
    type: String,
    default: 'max-h-48'
  }
});

defineEmits(['remove']);

const filteredOptions = computed(() => {
  return props.options.filter((option) =>
    props.selectedOptions.find((s) => {
      if (typeof s === 'string') {
        return s == option.value;
      } else {
        return s.id == option.value;
      }
    })
  );
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
}
</style>
