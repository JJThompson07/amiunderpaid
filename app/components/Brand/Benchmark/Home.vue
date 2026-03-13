<template>
  <div class="relative min-h-screen overflow-hidden bg-slate-50">
    <SectionSharedBackdrop />

    <main class="relative z-10 px-4 pt-20 pb-20">
      <SectionBenchmarkHero />

      <SectionBenchmarkRoleSearch
        :initial-country="isUSA ? 'USA' : 'UK'"
        @country-change="($event: string) => (isUSA = $event === 'USA')" />

      <SectionSharedTrustBadges />
    </main>
  </div>
</template>

<script setup lang="ts">
const { $siteBrand } = useNuxtApp();
const { t } = useI18n();

// 1. Geography Logic
// Defaulting to USA (true) since Benchmark My Role operates on the .com domain.
const isUSA = useState<boolean>('landing-is-usa', () => true);

// ✨ 2. Build the rock-solid SSR base URL (No localhost leaks!)
const baseUrl = import.meta.dev ? 'http://localhost:3000' : 'https://www.benchmarkmyrole.com';

// ✨ 3. Brand-Specific SEO using getter functions () => t(...) for perfect SSR
useSeoMeta({
  title: () => t('meta.benchmark_index.title'),
  description: () => t('meta.benchmark_index.description'),
  ogTitle: () => t('meta.benchmark_index.title'),
  ogDescription: () => t('meta.benchmark_index.description'),
  ogImage: `${baseUrl}/${$siteBrand}-og.png`, // Just make sure benchmarkmyrole-og.png exists in your public folder!
  twitterCard: 'summary_large_image'
});

// ✨ 4. Feed the baseUrl into your Schema
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: t('meta.benchmark_index.name'),
          url: baseUrl,
          description: t('meta.benchmark_index.description')
        })
    }
  ]
});
</script>
