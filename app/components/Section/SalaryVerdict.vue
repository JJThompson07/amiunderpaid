<template>
  <div class="text-center p-4 flex flex-col flex-1">
    <div class="flex flex-col items-center gap-2">
      <div class="flex flex-col sm:flex-row gap-3 items-center relative">
        <h2
          class="text-2xl font-bold rounded-full p-2 px-4 flex items-center justify-center gap-2"
          :class="[verdict.text, verdict.bg]">
          <component :is="verdict.icon" />
          {{ verdict.title }}
        </h2>
      </div>
      <div class="flex flex-col relative">
        <p class="text-sm text-slate-600 mt-1">
          <template v-if="diffPercent === 0">
            <i18n-t keypath="sections.verdict.in-line" tag="span" class="leading-relaxed">
              <template #exactly>
                <span class="font-bold text-slate-900">exactly in line</span>
              </template>
            </i18n-t>
          </template>
          <template v-else-if="isUnderpaid">
            {{ matchedTitle || displayTitle }} in
            {{ country === 'USA' ? matchedLocation || location || country : country }}
            {{ $t('sections.verdict.earn') }}
            <span class="font-bold text-slate-900"
              >{{ currencySymbol }}{{ marketAverage.toLocaleString() }}</span
            >.
          </template>
          <template v-else>
            <i18n-t keypath="sections.verdict.higher" tag="span" class="leading-relaxed">
              <template #percent>
                <span class="font-bold text-slate-900">{{ diffPercent }}% higher</span>
              </template>
              <template #average>
                <span class="font-bold text-slate-900"
                  >{{ currencySymbol }}{{ marketAverage.toLocaleString() }}</span
                >
              </template>
            </i18n-t>
          </template>
        </p>
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
  diffPercent: number;
  isUnderpaid: boolean;
}>();

const verdict = computed(() => {
  if (props.diffPercent === 0) {
    return {
      icon: Check,
      bg: 'bg-indigo-100',
      text: 'text-indigo-700',
      label: 'Fairly Paid',
      title: 'Spot on!'
    };
  }
  if (props.isUnderpaid) {
    return {
      icon: TrendingDown,
      bg: 'bg-negative-100',
      text: 'text-negative-700',
      label: 'Underpaid',
      title: `Uderpaid -${props.diffPercent}%`
    };
  }
  return {
    icon: TrendingUp,
    bg: 'bg-positive-100',
    text: 'text-positive-700',
    label: 'Above Market Average',
    title: `Valued ${props.diffPercent}%`
  };
});
</script>
