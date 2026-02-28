<template>
  <div
    class="card-result p-6 border shadow-xl rounded-2xl flex flex-col gap-3 flex-1 justify-between items-center relative select-none"
    :class="{ 'overflow-hidden': overflowHidden, [cardClasses]: true }">
    <section class="card-result--header flex items-center gap-2 justify-between w-full">
      <div class="flex flex-row gap-2 items-center">
        <div class="p-1.5 bg-slate-100 rounded-lg text-slate-600">
          <component :is="icon" class="w-4 h-4" aria-hidden="true" />
        </div>
        <h4 class="font-bold text-sm text-slate-900">{{ title }}</h4>
      </div>
      <AmIChip
        v-if="userSalary"
        :icon="chipData.icon"
        :bg-colour="chipData.bg"
        :text-colour="chipData.textColour"
        class="text-xs whitespace-nowrap"
        >{{ chipData.text }}</AmIChip
      >
    </section>
    <section
      v-if="$slots.info"
      class="section--info text-center text-2xs flex w-full justify-center items-center gap-1">
      <div
        class="flex flex-col items-center gap-2 px-3 py-1.5 min-w-0"
        :class="{
          'border border-amber-100 rounded-lg bg-amber-50 text-amber-700 font-medium': warning
        }">
        <slot name="info" />
      </div>
    </section>

    <section class="card-result--salaries w-full flex flex-row justify-between items-center mb-2">
      <div class="flex flex-col text-start flex-1">
        <span class="text-xs text-slate-500">{{ $t('card.result.your-salary') }}</span>
        <span class="font-black text-xl lg:text-3xl"
          >{{ currencySymbol }}{{ userSalary.toLocaleString() }}</span
        >
      </div>
      <ArrowLeftRightIcon class="w-8 h-8 text-slate-300" />
      <div class="flex flex-col text-end flex-1">
        <span class="text-xs text-slate-500">{{ $t('card.result.market-average') }}</span>
        <span class="font-black text-xl lg:text-3xl"
          >{{ currencySymbol }}{{ marketAverage.toLocaleString() }}</span
        >
      </div>
    </section>

    <section class="card-result--verdict w-full flex-1">
      <slot name="verdict" />
    </section>
    <section v-if="$slots.footer" class="card-result--footer w-full">
      <slot name="footer" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeftRightIcon, SquareCheckBig, ThumbsDown, ThumbsUp } from 'lucide-vue-next';

const props = defineProps({
  overflowHidden: {
    type: Boolean,
    default: false
  },
  icon: {
    type: [Object, Function] as PropType<Component>,
    default: null
  },
  iconBg: {
    type: String,
    default: 'bg-slate-100'
  },
  iconColour: {
    type: String,
    default: 'bg-slate-600'
  },
  title: {
    type: String,
    required: true
  },
  warning: {
    type: Boolean,
    default: false
  },
  comparison: {
    type: Number,
    default: 0
  },
  userSalary: {
    type: Number,
    default: 0
  },
  marketAverage: {
    type: Number,
    default: 0
  },
  currencySymbol: {
    type: String,
    default: ''
  }
});

const cardClasses = computed(() => {
  if (!props.userSalary) {
    return 'bg-slate-100 border-slate-200';
  }
  return props.comparison === 1
    ? 'bg-linear-to-b from-positive-50 via-white to-white border-positive-100'
    : props.comparison === -1
      ? 'bg-linear-to-b from-negative-50 via-white to-white border-negative-100'
      : 'bg-linear-to-b from-neutral-100 via-white to-white border-neutral-100';
});

const chipData = computed(() => {
  if (props.comparison === 1) {
    return {
      icon: ThumbsUp,
      text: $t('card.result.well-paid'),
      bg: 'bg-positive-200/50',
      textColour: 'text-positive-700'
    };
  } else if (props.comparison === -1) {
    return {
      icon: ThumbsDown,
      text: $t('card.result.underpaid'),
      bg: 'bg-negative-200/50',
      textColour: 'text-negative-700'
    };
  } else {
    return {
      icon: SquareCheckBig,
      text: $t('card.result.fairly-paid'),
      bg: 'bg-neutral-200/50',
      textColour: 'text-neutral-700'
    };
  }
});
</script>

<style scoped></style>
