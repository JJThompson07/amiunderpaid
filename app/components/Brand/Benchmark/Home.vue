<template>
  <div class="relative min-h-screen overflow-hidden bg-slate-50">
    <SectionSharedBackdrop />

    <main class="relative z-10 px-4 pt-20 pb-20">
      <SectionBenchmarkHero />

      <div class="flex justify-center mb-8">
        <div class="bg-gray-200/50 p-1 rounded-lg inline-flex shadow-sm">
          <button
            v-for="persona in userPersonas"
            :key="persona"
            type="button"
            class="px-6 py-2 rounded-md font-medium transition-all"
            :class="{
              'bg-white shadow text-primary-600': userPersona === persona,
              'text-gray-500': userPersona !== persona
            }"
            @click="userPersona = persona">
            {{ $t(`buttons.persona.${persona}`) }}
          </button>
        </div>
      </div>

      <SalarySearch
        :initial-country="isUSA ? 'USA' : 'UK'"
        @country-change="($event) => (isUSA = $event === 'USA')" />

      <!-- Why section -->
      <SectionSharedWhy :is-u-s-a="isUSA" />

      <SectionSharedTrustBadges />
    </main>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const url = useRequestURL();

// 1. Geography Logic
const isUSA = useState<boolean>('landing-is-usa', () => url.hostname.includes('.com'));

// 2. Persona State (Defaults to candidate)
const userPersonas = ['employee', 'employer'];
const userPersona = useState('userPersona', () => 'employee');

// 3. Brand-Specific SEO
// Make sure to add meta.benchmark_index.title to your i18n JSON files!
const title = computed(() => t('meta.benchmark_index.title'));
const description = computed(() => t('meta.benchmark_index.description'));

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: `${url.origin}/benchmark-og.png`, // You'll want a new social image for this brand!
  twitterCard: 'summary_large_image'
});
</script>
