<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <div
      class="w-full max-w-md bg-white shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <!-- Header -->
      <div class="p-6 border-b border-slate-100 bg-slate-50/50">
        <h3 class="text-lg font-black text-slate-900">Which role fits best?</h3>
        <p class="text-sm text-slate-500 mt-1">
          We found multiple groups for <span class="font-bold text-slate-900">{{ title }}</span
          >. Select the one that matches your job.
        </p>
      </div>

      <!-- List -->
      <div class="max-h-[60vh] overflow-y-auto p-2">
        <button
          v-for="match in matches"
          :key="match.group + match.soc"
          class="w-full text-left p-4 rounded-xl hover:bg-primary-50 transition-colors group flex items-center justify-between"
          @click="$emit('select', match)">
          <div>
            <div class="font-bold text-slate-700 group-hover:text-primary-700">
              {{ match.title }}
            </div>
            <div class="text-xs font-medium text-slate-400 uppercase tracking-wide mt-0.5">
              {{ match.group }}
            </div>
          </div>
          <div class="opacity-0 group-hover:opacity-100 transition-opacity text-primary-600">
            <ArrowRight class="w-5 h-5" />
          </div>
        </button>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
        <button
          class="text-xs font-bold text-slate-400 hover:text-slate-600 px-4 py-2"
          @click="$emit('close')">
          Use Default Match
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next';
import type { PropType } from 'vue';

defineProps({
  title: {
    type: String,
    required: true
  },
  matches: {
    type: Array as PropType<any[]>,
    default: () => []
  }
});

defineEmits(['select', 'close']);
</script>
