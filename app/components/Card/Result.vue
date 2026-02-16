<template>
  <div
    class="card-result p-4 bg-white border shadow-xl rounded-2xl border-slate-200 flex flex-col gap-2 flex-1 justify-between items-center relative"
    :class="{ 'overflow-hidden': overflowHidden }">
    <section class="card-result--header flex items-center gap-2 justify-start w-full">
      <div class="p-1.5 bg-slate-100 rounded-lg text-slate-600">
        <component :is="icon" class="w-4 h-4" aria-hidden="true" />
      </div>
      <h3 class="font-bold text-slate-900">{{ title }}</h3>
    </section>
    <section
      v-if="$slots.info"
      class="section--info text-center text-2xs flex w-full justify-center items-center gap-1">
      <div
        class="inline-flex items-center gap-2 px-3 py-1.5"
        :class="{
          'border border-amber-100 rounded-lg bg-amber-50 text-amber-700 font-medium': warning
        }">
        <InfoIcon
          class="h-3 w-3 shrink-0"
          :class="warning ? 'text-amber-700' : 'text-neutral-700'" />
        <slot name="info" />
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
import { InfoIcon } from 'lucide-vue-next';

defineProps({
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
  }
});
</script>

<style scoped></style>
