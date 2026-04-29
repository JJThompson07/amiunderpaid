<template>
  <div class="flex flex-col gap-4">
    <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">
      {{ $t('recruiter.territories.non-contiguous') }}
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        v-for="state in NON_CONTIGUOUS_TERRITORIES_USA"
        :key="state.id"
        :disabled="claimedIds.includes(state.id)"
        :class="[
          'p-4 rounded-2xl border transition-all flex items-center gap-4 text-left group',
          claimedIds.includes(state.id)
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 opacity-80 cursor-not-allowed'
            : selectedTerritories.some((t) => t.name === state.name)
              ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-inner'
              : 'bg-white border-slate-200 text-slate-700 hover:border-primary-300 hover:shadow-md cursor-pointer'
        ]"
        @click="handleRegionClick(state)">
        <div
          :class="[
            'w-20 h-20 shrink-0 transition-colors',
            claimedIds.includes(state.id)
              ? 'text-emerald-500'
              : selectedTerritories.some((t) => t.name === state.name)
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
            v-if="claimedIds.includes(state.id)"
            class="text-xs font-bold text-emerald-600 uppercase tracking-wide">
            Owned
          </span>
          <span
            v-else-if="selectedTerritories.some((t) => t.name === state.name)"
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
import type { PropType } from 'vue';

const props = defineProps({
  selectedTerritories: {
    type: Array as PropType<any[]>,
    required: true
  },
  claimedIds: {
    type: Array as PropType<number[]>,
    default: () => []
  }
});

const emit = defineEmits(['territory-clicked']);

// 1. Bring in our global master list helper
const { getTerritoryById } = useTerritories();

// 2. Create a smarter click handler
const handleRegionClick = (state: any) => {
  // Double-check they don't already own it
  if (props.claimedIds.includes(state.id)) return;

  // Grab the FULL territory object from the master list (which has the 'band'!)
  const fullTerritory = getTerritoryById(state.id);

  // Emit the rich object back to the parent cart
  emit('territory-clicked', fullTerritory || state);
};
</script>
