<template>
  <div class="relative min-h-screen overflow-hidden bg-slate-50">
    <!-- Background Gradient -->
    <div
      class="absolute top-0 left-0 w-full h-125 bg-linear-to-b from-secondary-900 to-slate-50 z-0"></div>

    <!-- Hero Content -->
    <main class="relative z-10 px-4 pt-20 pb-20">
      <div class="mb-10 space-y-4 text-center">
        <!-- Live Badge -->
        <div
          class="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold tracking-wider text-indigo-200 uppercase border rounded-full bg-primary-800/50 border-primary-700/50 backdrop-blur-sm">
          <span class="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></span>
          Live 2026 Market Data
        </div>

        <!-- Title -->
        <h1 class="text-4xl font-extrabold tracking-tight text-white md:text-6xl">
          Am I
          <span class="text-transparent bg-clip-text bg-linear-to-r from-primary-300 to-white"
            >Underpaid?</span
          >
        </h1>

        <!-- Subtitle -->
        <p class="max-w-2xl mx-auto text-lg font-light md:text-xl text-indigo-100/80">
          Stop guessing. Check your salary against 140,000+ live job listings and official
          government benchmarks in seconds.
        </p>
      </div>

      <!-- The Calculator Component -->
      <SalarySearch />

      <!-- Trust Badges (Visual only) -->
      <div
        class="flex flex-wrap justify-center gap-8 mt-16 transition duration-500 md:gap-16 opacity-50 grayscale hover:grayscale-0">
        <div class="flex items-center h-8 gap-2 font-bold text-slate-500">
          <div class="w-6 h-6 rounded-md bg-slate-400"></div>
          ONS Data
        </div>
        <div class="flex items-center h-8 gap-2 font-bold text-slate-500">
          <div class="w-6 h-6 rounded-md bg-slate-400"></div>
          Adzuna API
        </div>
        <div class="flex items-center h-8 gap-2 font-bold text-slate-500">
          <div class="w-6 h-6 rounded-md bg-slate-400"></div>
          Gov.uk
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
// Nuxt automatically imports the SalarySearch component from /components
</script>
