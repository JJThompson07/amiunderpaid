<template>
  <div class="flex flex-wrap justify-center gap-8 mt-16 md:gap-16 opacity-50">
    <div
      v-if="!isUSSite"
      class="flex items-center h-8 gap-2 font-bold text-slate-500 grayscale hover:grayscale-0 transition-all duration-500">
      <SquareCheckBig class="w-6 h-6 text-primary-400" aria-hidden="true" />
      {{ $t('landing.sources.ons') }}
    </div>
    <div
      class="flex items-center h-8 gap-2 font-bold text-slate-500 grayscale hover:grayscale-0 transition-all duration-500">
      <SquareCheckBig class="w-6 h-6 text-primary-400" aria-hidden="true" />
      {{ $t('landing.sources.reed') }}
    </div>
    <div
      class="flex items-center h-8 gap-2 font-bold text-slate-500 grayscale hover:grayscale-0 transition-all duration-500">
      <SquareCheckBig class="w-6 h-6 text-primary-400" aria-hidden="true" />
      {{ $t('landing.sources.adzuna') }}
    </div>
    <div
      v-if="isUSSite"
      class="flex items-center h-8 gap-2 font-bold text-slate-500 grayscale hover:grayscale-0 transition-all duration-500">
      <SquareCheckBig class="w-6 h-6 text-primary-400" aria-hidden="true" />
      {{ $t('landing.sources.bls') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { SquareCheckBig } from 'lucide-vue-next';
const { isUSSite } = useRegion();
</script>

<style scoped></style>
