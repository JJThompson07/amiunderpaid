<template>
  <div class="relative flex items-center justify-center w-12 h-12">
    <img
      :src="`/mca-brackets/${bracketMap[bracket].svg}`"
      alt=""
      class="absolute object-contain w-8 h-8" />
    <component
      :is="bracketMap[bracket].icon"
      class="relative z-10 w-5 h-5"
      :class="bracketMap[bracket].colour" />
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { Crown, Shuffle, Siren, TrendingDown, TrendingUp } from 'lucide-vue-next';

type Bracket = 'below' | 'competitive' | 'leader' | 'review' | 'strong';

defineProps<{
  bracket: Bracket;
}>();

const bracketMap: Record<Bracket, { colour: string; icon: Component; svg: string }> = {
  leader: { svg: 'market-leader.svg', icon: Crown, colour: 'text-positive-800' },
  strong: { svg: 'strong-alignment.svg', icon: TrendingUp, colour: 'text-neutral-800' },
  competitive: { svg: 'competitive.svg', icon: Shuffle, colour: 'text-warning-800' },
  below: { svg: 'below-market.svg', icon: TrendingDown, colour: 'text-negative-800' },
  review: { svg: 'action-required.svg', icon: Siren, colour: 'text-negative-900' }
};
</script>
