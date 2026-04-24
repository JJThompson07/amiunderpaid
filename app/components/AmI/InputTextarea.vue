<template>
  <div class="w-full relative">
    <label
      v-if="label"
      class="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
      {{ label }}
    </label>
    <textarea
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400 shadow-sm"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"></textarea>
  </div>
</template>

<script setup lang="ts">
defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  rows: { type: [Number, String], default: 4 }
});

defineEmits(['update:modelValue']);
</script>
