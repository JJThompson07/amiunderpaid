<template>
  <div class="relative min-h-screen overflow-hidden bg-slate-50">
    <!-- Background Gradient -->
    <SectionSharedBackdrop />

    <!-- Hero Content -->
    <main class="relative z-10 px-4 pt-20 pb-20">
      <SectionAmIHero />

      <!-- The Calculator Component -->
      <SectionAmISalarySearch
        :initial-country="isUSA ? 'USA' : 'UK'"
        @country-change="($event) => (isUSA = $event === 'USA')" />

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

const { t } = useI18n();
const url = useRequestURL();
const isUSA = useState<boolean>('landing-is-usa', () => url.hostname.includes('.com'));

const title = computed(() => t('meta.index.title'));
const description = computed(() => t('meta.index.description'));

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: `${url.origin}/amiunderpaid-og.png`,
  twitterCard: 'summary_large_image'
});

useHead({
  // The @nuxtjs/i18n module automatically handles 'rel: alternate' and canonical links
  // if 'seo: true' or 'addSeoAttributes: true' is configured,
  // but you can still add your JSON-LD manually:
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: $t('meta.index.title'),
        url: url.origin,
        description: description.value
      })
    }
  ]
});
</script>
