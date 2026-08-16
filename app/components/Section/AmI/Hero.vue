<template>
  <div class="mb-10 space-y-4 text-center">

    <!-- Title -->
    <h1 class="text-4xl font-extrabold tracking-tight text-white md:text-6xl">
      {{ $t('landing.heading') }}
    </h1>

    <!-- Subtitle -->
    <h2 class="max-w-2xl mx-auto font-light text-lg md:text-xl text-white/80">
      {{ $t('landing.subheading') }}
    </h2>

    <!-- Subtitle -->
    <p class="max-w-2xl mx-auto font-light text-sm md:text-base text-white/80">
      {{ $t('landing.subheading-context') }}
    </p>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped></style>
