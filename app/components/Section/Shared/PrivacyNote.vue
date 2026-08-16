<template>
  <section class="max-w-4xl mx-auto p-4 select-none text-xs text-center text-slate-400 flex flex-col items-center gap-4">
    <div
      class="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary-700 uppercase bg-primary-50 rounded-full border border-primary-100">
      <span class="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse" />
      {{ $t('common.live-market-data', { year: new Date().getFullYear() }) }}
    </div>
    <p>
      {{ $t('landing.privacy-note') }}
    </p>
  </section>
</template>

<script setup lang="ts"></script>

<style scoped></style>
