<template>
  <div class="mb-10 space-y-4 text-center">
    <!-- Live Badge -->
    <div
      class="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold tracking-wider text-indigo-200 uppercase border rounded-full bg-primary-800/50 border-primary-700/50 backdrop-blur-sm">
      <span class="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></span>
      {{ $t('common.live-market-data', { year: new Date().getFullYear() }) }}
    </div>

    <!-- Title -->
    <h1 class="text-4xl font-extrabold tracking-tight text-white md:text-6xl">
      {{ $t('landing.benchmark.heading') }}
    </h1>

    <!-- Subtitle -->
    <h2 class="max-w-2xl mx-auto font-light text-lg md:text-xl text-white/80">
      {{ $t('landing.benchmark.subheading') }}
    </h2>

    <!-- Subtitle -->
    <p class="max-w-2xl mx-auto font-light text-sm md:text-base text-white/80">
      {{ $t('landing.benchmark.subheading-context') }}
    </p>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped></style>
