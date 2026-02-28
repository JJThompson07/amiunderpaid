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

        <span
          v-if="
            matchedLocation && location && matchedLocation.toLowerCase() !== location.toLowerCase()
          ">
          in <span class="font-bold">{{ matchedLocation }}</span></span
        >.
      </span>
    </template>

    <AmIButton v-if="showButton" class="w-max text-2xs shadow-md" @click="$emit('user-select')">{{
      $t('buttons.not-best-match')
    }}</AmIButton>

    <template #verdict>
      <LazySectionSalaryVerdict
        v-if="userSalary > 0"
        :display-title="displayTitle"
        :location="location"
        :country="country"
        :market-average="marketAverage"
        :currency-symbol="currencySymbol"
        :matched-title="matchedTitle"
        :matched-location="matchedLocation"
        :diff="Math.abs(userSalary - marketAverage)"
        :diff-percent="diffPercent"
        :comparison="comparison"
        :is-underpaid="isUnderpaid" />
    </template>

    <template #footer>
      <LazySectionGovernmentSalaryVisualizer
        :user-salary="userSalary"
        :market-average="marketAverage"
        :market-low="marketLow"
        :market-high="marketHigh"
        :currency-symbol="currencySymbol"
        :diff-percent="diffPercent"
        :is-underpaid="isUnderpaid" />
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
  showButton: boolean;
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
