<template>
  <div class="mb-6 overflow-hidden bg-white border shadow-xl rounded-2xl border-slate-200 relative">
    <div class="p-12 text-center">
      <div class="inline-flex p-4 mb-4 bg-negative-100 rounded-full text-slate-400">
        <component :is="icon" class="w-8 h-8 text-negative-700" />
      </div>
      <h2 class="text-2xl font-bold text-slate-900 mb-2">{{ $t('card.no-data.heading') }}</h2>
      <p class="text-slate-500 max-w-md mx-auto mb-8">
        <i18n-t keypath="card.no-data.body" tag="p" class="leading-relaxed">
          <template #role>
            <span class="font-bold">{{ title }}</span>
          </template>
          <template #location>
            <span class="font-bold">{{ location || country }}</span>
          </template>
        </i18n-t>
      </p>
      <NuxtLink to="/">
        <AmIButton title="Try a different search" text-colour="text-white">
          {{ $t('card.no-data.try-different') }}
        </AmIButton>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component, PropType } from 'vue';

defineProps({
  icon: {
    type: [Object, Function] as PropType<Component>,
    default: null
  },
  title: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    required: true
  },
  period: {
    type: String,
    required: true
  }
});
</script>

<style scoped></style>
