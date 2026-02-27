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
          {{ $t('common.live-market-data', { year: new Date().getFullYear() }) }}
        </div>

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

      <!-- The Calculator Component -->
      <SalarySearch
        :initial-country="isUSA ? 'USA' : 'UK'"
        @country-change="($event) => (isUSA = $event === 'USA')" />

      <section class="max-w-4xl mx-auto p-4 select-none text-xs text-center text-slate-400">
        <p>
          {{ $t('landing.privacy-note') }}
        </p>
      </section>

      <!-- Why section -->
      <section
        class="max-w-4xl mx-auto mt-20 px-4 pb-20 border-t border-slate-200 pt-16 select-none">
        <div class="grid md:grid-cols-2 gap-12 text-slate-600">
          <div>
            <h3 class="text-xl font-bold text-secondary-900 mb-4">Why check your market rate?</h3>
            <p class="leading-relaxed">
              <i18n-t
                keypath="landing.why.body"
                tag="p"
                class="leading-relaxed"
                :values="{ year: new Date().getFullYear() }">
                <template #benchmarks>
                  <strong>{{ $t('landing.why.benchmarks_bold') }}</strong>
                </template>
              </i18n-t>
            </p>
          </div>
          <div>
            <h3 class="text-xl font-bold text-secondary-900 mb-4">
              {{ $t('landing.data.heading') }}
            </h3>
            <p class="leading-relaxed">
              <i18n-t
                keypath="landing.data.body"
                tag="p"
                class="leading-relaxed"
                :values="{ comparison: $t('landing.data.comparison_bold') }">
                <template #comparison>
                  <strong>{{ $t('landing.data.comparison_bold') }}</strong>
                </template>
              </i18n-t>
            </p>
          </div>
        </div>
      </section>

      <!-- Trust Badges (Visual only) -->
      <div class="flex flex-wrap justify-center gap-8 mt-16 md:gap-16 opacity-50">
        <div
          class="flex items-center h-8 gap-2 font-bold text-slate-500 grayscale hover:grayscale-0 transition-all duration-500">
          <SquareCheckBig class="w-6 h-6 text-primary-400" aria-hidden="true" />
          {{ $t('landing.sources.ons') }}
        </div>
        <div
          class="flex items-center h-8 gap-2 font-bold text-slate-500 grayscale hover:grayscale-0 transition-all duration-500">
          <SquareCheckBig class="w-6 h-6 text-primary-400" aria-hidden="true" />
          {{ $t('landing.sources.adzuna') }}
        </div>
        <div
          class="flex items-center h-8 gap-2 font-bold text-slate-500 grayscale hover:grayscale-0 transition-all duration-500">
          <SquareCheckBig class="w-6 h-6 text-primary-400" aria-hidden="true" />
          {{ $t('landing.sources.bls') }}
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { SquareCheckBig } from 'lucide-vue-next';

// Nuxt automatically imports the SalarySearch component from /components

const { t } = useI18n();
const url = useRequestURL();
const isUSA = useState<boolean>('landing-is-usa', () => url.hostname.includes('.com'));

const title = computed(() => t('landing.seo.title'));
const description = computed(() => t('landing.seo.description'));

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: `${url.origin}/og.png`,
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
        name: 'Am I Underpaid?',
        url: url.origin,
        description: description.value
      })
    }
  ]
});
</script>
