<template>
  <div class="w-full relative">
    <label
      v-if="label"
      class="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
      {{ label }}
    </label>
    <div
      class="flex items-center gap-3 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all">
      <input
        type="color"
        :value="modelValue"
        class="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent color-input shrink-0"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
      <span class="text-sm font-medium text-slate-700 uppercase flex-1 font-mono">
        {{ modelValue }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  modelValue: { type: String, default: '#000000' },
  label: { type: String, default: '' }
});

defineEmits(['update:modelValue']);
</script>

<style scoped>
.color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}
.color-input::-webkit-color-swatch {
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
}
.color-input::-moz-color-swatch {
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
}
</style>
