<template>
  <div class="w-full relative">
    <label
      v-if="label"
      class="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
      {{ label }}
    </label>
    <label
      class="flex flex-col items-center px-4 py-8 bg-slate-50 text-primary-600 rounded-2xl border-2 border-dashed border-slate-200 cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-all group">
      <UploadCloud
        class="w-8 h-8 mb-2 text-slate-300 group-hover:text-primary-400 transition-colors" />
      <span
        class="text-xs font-bold uppercase tracking-wide text-slate-500 group-hover:text-primary-600">
        {{ fileName || placeholder || 'Upload Image' }}
      </span>
      <input type="file" class="hidden" :accept="accept" @change="$emit('change', $event)" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { UploadCloud } from 'lucide-vue-next';

defineProps({
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'Upload Image' },
  fileName: { type: String, default: '' },
  accept: { type: String, default: 'image/png, image/jpeg' }
});

defineEmits(['change']);
</script>
