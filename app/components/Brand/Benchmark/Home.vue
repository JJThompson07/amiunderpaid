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
const url = useRequestURL();

// 1. Geography Logic
const isUSA = useState<boolean>('landing-is-usa', () => url.hostname.includes('.com'));

// 3. Brand-Specific SEO
// Make sure to add meta.benchmark_index.title to your i18n JSON files!
const title = computed(() => t('meta.benchmark_index.title'));
const description = computed(() => t('meta.benchmark_index.description'));

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: `${url.origin}/${$siteBrand}-og.png`, // You'll want a new social image for this brand!
  twitterCard: 'summary_large_image'
});
</script>
