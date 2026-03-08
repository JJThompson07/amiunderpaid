<template>
  <div class="relative min-h-screen overflow-hidden bg-slate-50">
    <!-- Background Gradient -->
    <SectionSharedBackdrop />

    <!-- Hero Content -->
    <main class="relative z-10 px-4 pt-20 pb-20">
      <SectionAmIHero />

      <!-- The Calculator Component -->
      <SectionAmISalarySearch />

      <!-- Privacy Note section -->
      <SectionSharedPrivacyNote />

      <!-- Why section -->
      <SectionSharedWhy :is-u-s-a="isUSA" />

      <!-- Trust Badges (Visual only) -->
      <SectionSharedTrustBadges />
    </main>
  </div>
</template>

<script setup lang="ts">
// Nuxt automatically imports the SalarySearch component from /components

const { $siteBrand } = useNuxtApp();
const { t } = useI18n();
const url = useRequestURL();
const isUSA = useState<boolean>('landing-is-usa', () => url.hostname.includes('.com'));

const title = computed(() => t('meta.index.title'));
const description = computed(() => t('meta.index.description'));

// Cleaned up SEO Meta block
useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: `${url.origin}/${$siteBrand}-og.png`,
  twitterCard: 'summary_large_image'
});

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: t('meta.index.name'),
        url: url.origin,
        description: description.value
      })
    }
  ]
});
</script>
