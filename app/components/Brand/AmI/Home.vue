<template>
  <div class="relative min-h-screen overflow-hidden">
    <!-- Hero Content -->
    <main class="relative z-10 px-4 pt-20 pb-20">
      <SectionAmIHero />

      <!-- The Calculator Component -->
      <SectionAmISalarySearch />

      <!-- Privacy Note section -->
      <SectionSharedPrivacyNote />

      <!-- Why section -->
      <SectionSharedWhy :is-u-s-a="isUSSite" />

      <!-- Trust Badges (Visual only) -->
      <SectionSharedTrustBadges />
    </main>
  </div>
</template>

<script setup lang="ts">
// Nuxt automatically imports the SalarySearch component from /components

const { $siteBrand } = useNuxtApp();
const { t } = useI18n();
const { isUSSite } = useRegion();

// ✨ 1. Build the rock-solid SSR base URL (Kills the localhost leaks!)
const baseUrl = import.meta.dev
  ? 'http://localhost:3000'
  : isUSSite.value
    ? 'https://www.amiunderpaid.com'
    : 'https://www.amiunderpaid.co.uk';

// ✨ 2. Use getter functions () => t(...) to guarantee SSR reactivity for the Title
useSeoMeta({
  title: () => t('meta.index.title'),
  description: () => t('meta.index.description'),
  ogTitle: () => t('meta.index.title'),
  ogDescription: () => t('meta.index.description'),
  ogImage: `${baseUrl}/${$siteBrand}-og.png`,
  twitterCard: 'summary_large_image'
});

// ✨ 3. Feed the baseUrl into your Schema
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: t('meta.index.name'),
          title: t('meta.index.title'),
          url: baseUrl,
          description: t('meta.index.description')
        })
    }
  ]
});
</script>
