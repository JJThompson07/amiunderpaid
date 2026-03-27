<template>
  <div class="flex flex-col gap-4">
    <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">
      {{ $t('recruiter.territories.non-contiguous') }}
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        v-for="state in NON_CONTIGUOUS_TERRITORIES_USA"
        :key="state.id"
        :class="[
          'p-4 rounded-2xl border transition-all flex items-center gap-4 text-left group',
          selectedTerritories.some((t) => t.name === state.name)
            ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-inner'
            : 'bg-white border-slate-200 text-slate-700 hover:border-primary-300 hover:shadow-md'
        ]"
        @click="$emit('territory-clicked', state)">
        <div
          :class="[
            'w-20 h-20 shrink-0 transition-colors',
            selectedTerritories.some((t) => t.name === state.name)
              ? 'text-primary-500'
              : 'text-slate-400 group-hover:text-primary-500'
          ]">
          <div
            class="w-full h-full bg-current"
            :style="{
              WebkitMaskImage: `url('/${state.name.toLowerCase().replace(' ', '-')}.svg')`,
              maskImage: `url('/${state.name.toLowerCase().replace(' ', '-')}.svg')`,
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center'
            }"></div>
        </div>
        <div class="flex-1">
          <span class="font-bold block text-lg">{{ state.name }}</span>
          <span
            v-if="selectedTerritories.some((t) => t.name === state.name)"
            class="text-xs font-bold text-primary-600 uppercase tracking-wide">
            {{ $t('common.selected') }}
          </span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NON_CONTIGUOUS_TERRITORIES_USA } from '../../../utils/locations/usa';

defineProps({
  selectedTerritories: {
    type: Array as PropType<any[]>,
    required: true
  }
});

defineEmits(['territory-clicked']);
</script>

<style scoped></style>
