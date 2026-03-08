<template>
  <CardResult
    class="government-comparison"
    :icon="Landmark"
    :title="$t('sections.government.title')"
    :comparison="comparison"
    :user-salary="userSalary"
    :market-average="marketAverage"
    :currency-symbol="currencySymbol"
    :warning="
      isFallback &&
      Boolean(
        (matchedTitle && matchedTitle.toLowerCase() !== searchTitle.toLowerCase()) ||
        (matchedLocation && location && matchedLocation.toLowerCase() !== location.toLowerCase())
      )
    ">
    <template #info>
      <h4 class="font-bold text-xl lg:text-2xl md:line-clamp-1" :title="matchedTitle">
        {{ matchedTitle }}
      </h4>
      <span v-if="!isFallback">
        <span>{{
          matchedTitle && matchedTitle.toLowerCase() !== searchTitle.toLowerCase()
            ? $t('sections.government.market-category')
            : $t('sections.government.market-role')
        }}</span>
      </span>
      <span v-else>
        {{ $t('sections.government.not-found', { marketDataYear }) }}
      </span>
    </template>

    <template #verdict>
      <LazySectionSalaryVerdict
        v-if="userSalary > 0"
        :market-average="marketAverage"
        :currency-symbol="currencySymbol"
        :diff="Math.abs(userSalary - marketAverage)"
        :diff-percent="diffPercent"
        :comparison="comparison"
        :is-underpaid="isUnderpaid" />
    </template>

    <template #footer>
      <div class="flex flex-col gap-2">
        <LazySectionGovernmentSalaryVisualizer
          :user-salary="userSalary"
          :market-average="marketAverage"
          :market-low="marketLow"
          :market-high="marketHigh"
          :currency-symbol="currencySymbol"
          :diff-percent="diffPercent"
          :is-underpaid="isUnderpaid" />
        <AmIButton
          v-if="!isVerified"
          class="w-max text-2xs shadow-md ml-auto"
          :title="$t('buttons.not-best-match')"
          bg-colour="bg-amber-600"
          text-colour="text-white"
          animation-colour="bg-amber-700"
          @click="$emit('user-select')"
          >{{ $t('buttons.not-best-match') }}</AmIButton
        >
      </div>
    </template>
  </CardResult>
</template>

<script setup lang="ts">
import { Landmark } from 'lucide-vue-next';

const props = defineProps<{
  isFallback: boolean;
  displayTitle: string;
  location: string;
  country: string;
  userSalary: number;
  marketAverage: number;
  currencySymbol: string;
  matchedTitle: string;
  matchedLocation: string;
  searchTitle: string;
  marketDataYear: number;
  diffPercent: number;
  isUnderpaid: boolean;
  marketLow: number;
  marketHigh: number;
  isVerified: boolean;
}>();

defineEmits(['user-select']);

const comparison = computed<number>(() => {
  if (props.diffPercent > 2.5) {
    return 1;
  } else if (props.diffPercent < -2.5) {
    return -1;
  } else {
    return 0;
  }
});
</script>

<style scoped></style>
