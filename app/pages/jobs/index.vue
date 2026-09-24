<template>
  <div class="relative min-h-screen overflow-hidden">
    <SectionSharedBackdrop />

    <main class="relative z-10 px-4 pt-20 pb-20">
      <div class="mb-10 space-y-4 text-center">
        <h1 class="text-4xl md:text-6xl font-black tracking-tighter text-white drop-shadow-md">
          {{ $t('sections.jobs.landing.heading') }}
        </h1>
        <h2 class="max-w-2xl mx-auto font-medium text-lg md:text-xl text-white/90 drop-shadow-sm">
          {{ $t('sections.jobs.landing.subheading') }}
        </h2>
      </div>

      <BaseSearchForm mode="jobs" />

      <!-- Dev Tools (Floating) -->
      <AmIDevProviderToggle v-if="isDev" />

      <section class="w-full max-w-5xl mx-auto mt-12 select-none">
        <h3 class="text-xs font-bold text-slate-400 mb-5 text-center uppercase tracking-widest">
          {{ $t('sections.jobs.landing.popular.heading') }}
        </h3>
        <div class="flex flex-wrap justify-center gap-3 px-4">
          <NuxtLink
            v-for="role in popularRoles"
            :key="role"
            :to="getRoleUrl(role)"
            class="inline-flex items-center px-5 py-2.5 text-sm font-medium text-primary-900 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 hover:border-primary-300 transition-all duration-300 shadow-sm hover:shadow-md">
            {{ role }}
          </NuxtLink>
        </div>
      </section>

      <section class="max-w-5xl mx-auto mt-20 px-4 pb-4 select-none">
        <div class="grid md:grid-cols-3 gap-6 text-slate-600">
          <div
            v-for="card in valueProps"
            :key="card.title"
            class="bg-white/50 backdrop-blur-xl border border-slate-200/60 p-8 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <component :is="card.icon" class="w-8 h-8 text-primary-500 mb-4" />
            <h3 class="text-xl font-black tracking-tight text-secondary-950 mb-2">
              {{ card.title }}
            </h3>
            <p class="leading-relaxed text-slate-600">{{ card.body }}</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Briefcase, Layers, TrendingUp } from 'lucide-vue-next';
import { computed } from 'vue';
import { slugify } from '~/helpers/utility';

const { $siteBrand } = useNuxtApp();
const { t, tm } = useI18n();
const { currentCountry, isUSSite } = useRegion();
const isDev = import.meta.dev;

type TrendingRole = { title: string };

const popularRoles = computed<string[]>(() => {
  const roles = tm('landing.trending.roles') as unknown as TrendingRole[];
  return Array.isArray(roles) ? roles.map((role) => role.title) : [];
});

const valueProps = computed(() => [
  {
    icon: Briefcase,
    title: t('card.value-prop.live-listings.title'),
    body: t('card.value-prop.live-listings.body')
  },
  {
    icon: Layers,
    title: t('card.value-prop.dual-tier.title'),
    body: t('card.value-prop.dual-tier.body')
  },
  {
    icon: TrendingUp,
    title: t('card.value-prop.compare-pay.title'),
    body: t('card.value-prop.compare-pay.body')
  }
]);

const getRoleUrl = (role: string): string =>
  `/jobs/${slugify(role)}/${currentCountry.value.toLowerCase()}`;

const baseUrl = import.meta.dev
  ? 'http://localhost:3000'
  : isUSSite.value
    ? 'https://www.amiunderpaid.com'
    : 'https://www.amiunderpaid.co.uk';

useSeoMeta({
  title: () => t('meta.jobs_index.title'),
  description: () => t('meta.jobs_index.description'),
  ogTitle: () => t('meta.jobs_index.title'),
  ogDescription: () => t('meta.jobs_index.description'),
  ogImage: `${baseUrl}/${$siteBrand}-og.png`,
  twitterCard: 'summary_large_image'
});

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: (): string =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: t('meta.jobs_index.name'),
          title: t('meta.jobs_index.title'),
          url: `${baseUrl}/jobs`,
          description: t('meta.jobs_index.description')
        })
    }
  ]
});
</script>
