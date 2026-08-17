<template>
  <div class="mb-10 space-y-4 text-center">
    <!-- Title -->
    <h1 class="text-4xl md:text-6xl font-black tracking-tighter text-white drop-shadow-md">
      {{ $t('landing.heading') }}
    </h1>

    <!-- Subtitle -->
    <h2 class="max-w-2xl mx-auto font-medium text-lg md:text-xl text-white/90 drop-shadow-sm">
      {{ $t('landing.subheading') }}
    </h2>

    <!-- Subtitle Context -->
    <p class="max-w-2xl mx-auto font-normal text-sm md:text-base text-white/70">
      {{ $t('landing.subheading-context') }}
    </p>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped></style>
