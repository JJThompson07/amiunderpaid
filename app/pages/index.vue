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
          <span class="text-transparent bg-clip-text bg-white">Underpaid?</span>
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
          <SquareCheckBig class="w-6 h-6 text-primary-400" />
          ONS Data
        </div>
        <div class="flex items-center h-8 gap-2 font-bold text-slate-500">
          <Square class="w-6 h-6 text-slate-400" />
          Adzuna API
          <span
            class="ml-1 text-[10px] uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full"
            >Coming Soon</span
          >
        </div>
        <div class="flex items-center h-8 gap-2 font-bold text-slate-500">
          <SquareCheckBig class="w-6 h-6 text-primary-400" />
          BLS Data
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Square, SquareCheckBig } from 'lucide-vue-next';

// Nuxt automatically imports the SalarySearch component from /components

const url = useRequestURL();
const isUSA = url.hostname.includes('.com');

const title = isUSA
  ? 'Am I Underpaid? | Check Your Salary & USA Market Rates'
  : 'Am I Underpaid? | Check Your Salary & Average Wage for Your Role';

const description = isUSA
  ? 'Find out the average salary for your role in the USA. Compare your wage against live market data and BLS benchmarks to see if you are underpaid.'
  : 'Find out the average salary for your role. Compare your wage against live market data and official government benchmarks (ONS) to see if you are underpaid.';

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: `${url.origin}/og.png`, // Ensure you have a default og.png in your public folder
  twitterCard: 'summary_large_image'
});

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Am I Underpaid?',
        url: url.origin,
        description: description
      })
    }
  ],
  link: [{ rel: 'canonical', href: url.href }]
});
</script>
