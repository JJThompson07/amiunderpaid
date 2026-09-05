<template>
  <div class="w-full relative">
    <label
      v-if="label"
      class="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
      {{ label }}
    </label>
    <label
      class="flex items-center gap-4 bg-slate-50 text-primary-600 rounded-2xl border-2 border-dashed border-slate-200 cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-all group"
      :class="previewUrl ? 'px-4 py-3' : 'flex-col px-4 py-8'">
      <template v-if="previewUrl">
        <img
          :src="previewUrl"
          alt=""
          class="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 bg-white" />
        <div class="flex-1 min-w-0 text-left">
          <p class="text-xs font-bold text-slate-600 truncate">{{ fileName }}</p>
          <p
            class="text-2xs font-bold uppercase tracking-wide text-primary-500 group-hover:text-primary-600">
            {{ changeHint }}
          </p>
        </div>
      </template>
      <template v-else>
        <UploadCloud
          class="w-8 h-8 mb-2 text-slate-300 group-hover:text-primary-400 transition-colors" />
        <span
          class="text-xs font-bold uppercase tracking-wide text-slate-500 group-hover:text-primary-600">
          {{ placeholder }}
        </span>
      </template>
      <input type="file" class="hidden" :accept="accept" @change="$emit('change', $event)" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import { UploadCloud } from 'lucide-vue-next';

const props = defineProps({
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'Upload Image' },
  changeHint: { type: String, default: 'Click to upload a new image' },
  fileName: { type: String, default: '' },
  accept: { type: String, default: 'image/png, image/jpeg' },
  // The newly selected (not-yet-uploaded) file, if any — takes priority over existingUrl.
  file: { type: Object as PropType<File | null>, default: null },
  // The currently saved image URL, shown when no new file has been selected yet.
  existingUrl: { type: String, default: '' }
});

defineEmits<{
  (e: 'change', event: Event): void;
}>();

const previewUrl = computed(() => {
  if (props.file instanceof File) {
    return URL.createObjectURL(props.file);
  }
  return props.existingUrl || '';
});
</script>
