<template>
  <div class="flex flex-col flex-1">
    <div class="flex flex-col items-center gap-2">
      <div
        class="flex flex-row gap-3 relative flex-1 w-full rounded-lg p-4 items-center"
        :class="[verdict.text, verdict.bg]">
        <component :is="verdict.icon" />
        <div class="flex flex-col gap-1">
          <p class="text-sm">
            {{ verdict.title }}
          </p>
          <p class="text-sm">
            <span class="text-base font-bold"
              >{{ props.currencySymbol }}{{ diff.toLocaleString() }}</span
            >
            ({{ diffPercent }}%)
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Check, TrendingDown, TrendingUp } from 'lucide-vue-next';

const props = defineProps<{
  displayTitle: string;
  location: string;
  country: string;
  marketAverage: number;
  currencySymbol: string;
  matchedTitle: string;
  matchedLocation: string;
  diff: number;
  diffPercent: number;
  isUnderpaid: boolean;
  comparison: number;
}>();

const verdict = computed(() => {
  if (props.comparison === 0) {
    return {
      icon: Check,
      bg: 'bg-neutral-100/50',
      text: 'text-neutral-700',
      title: $t('sections.verdict.fairly-paid')
    };
  }
  if (props.comparison === -1) {
    return {
      icon: TrendingDown,
      bg: 'bg-negative-100/50',
      text: 'text-negative-700',
      title: $t('sections.verdict.variance')
    };
  }
  return {
    icon: TrendingUp,
    bg: 'bg-positive-100/50',
    text: 'text-positive-700',
    title: $t('sections.verdict.variance')
  };
});
</script>
