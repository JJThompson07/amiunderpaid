<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <div
      class="w-full max-w-md bg-white shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="p-6 border-b border-slate-100 bg-slate-50/50">
        <h3 class="text-lg font-black text-slate-900">{{ $t('modals.ambiguity.title') }}</h3>
        <p class="text-sm text-slate-500 mt-1">
          <i18n-t keypath="modals.ambiguity.content" tag="p" class="leading-relaxed">
            <template #title>
              <span class="font-bold">{{ searchTerm }}</span>
            </template>
          </i18n-t>
        </p>
      </div>

      <div class="max-h-[60vh] overflow-y-auto p-2">
        <button
          v-for="match in options"
          :key="match.id_code"
          class="w-full text-left p-4 rounded-xl hover:bg-primary-50 transition-colors group flex items-center justify-between"
          @click="$emit('resolve', match.id_code)">
          <div>
            <div class="font-bold text-slate-700 group-hover:text-primary-700">
              {{ match.group_name }}
            </div>
            <div class="text-xs font-medium text-slate-400 uppercase tracking-wide mt-0.5">
              SOC: {{ match.id_code }}
            </div>
          </div>
          <div class="opacity-0 group-hover:opacity-100 transition-opacity text-primary-600">
            <ArrowRight class="w-5 h-5" />
          </div>
        </button>
      </div>

      <div class="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
        <button
          class="text-xs font-bold text-slate-400 hover:text-slate-600 px-4 py-2"
          @click="$emit('close')">
          {{ $t('modals.ambiguity.use-default') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next';
import type { PropType } from 'vue';

defineProps({
  searchTerm: {
    type: String,
    required: true
  },
  options: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  // Added this to catch the prop passed from Search.vue
  country: {
    type: String,
    default: ''
  }
});

// Changed 'select' to 'resolve' to match the parent's @resolve listener
defineEmits(['resolve', 'close']);
</script>
