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
        <h2 class="max-w-2xl mx-auto text-lg font-light md:text-xl text-indigo-100/80">
          Stop guessing. Check your salary against 140,000+ live job listings and official
          government benchmarks in seconds.
        </h2>
      </div>

      <!-- The Calculator Component -->
      <SalarySearch @country-change="($event) => (isUSA = $event === 'USA')" />

      <!-- Why section -->
      <section
        class="max-w-4xl mx-auto mt-20 px-4 pb-20 border-t border-slate-200 pt-16 select-none">
        <div class="grid md:grid-cols-2 gap-12 text-slate-600">
          <div>
            <h3 class="text-xl font-bold text-secondary-900 mb-4">Why check your market rate?</h3>
            <p class="leading-relaxed">
              In the rapidly shifting 2026 job market, staying informed about
              <strong>salary benchmarks</strong>
              is essential for fair compensation. Whether you are preparing for a performance review
              or exploring new opportunities, our tool provides the transparency you need to
              negotiate with confidence.
            </p>
          </div>
          <div>
            <h3 class="text-xl font-bold text-secondary-900 mb-4">Data-Driven Insights</h3>
            <p class="leading-relaxed">
              We aggregate data from the
              {{
                isUSA ? 'Bureau of Labor Statistics (BLS)' : 'Office for National Statistics (ONS)'
              }}
              and analyze thousands of live job listings. This ensures your
              <strong>salary comparison</strong>
              reflects real-world economic conditions and regional pay variations.
            </p>
          </div>
        </div>
      </section>

      <!-- Trust Badges (Visual only) -->
      <div class="flex flex-wrap justify-center gap-8 mt-16 md:gap-16 opacity-50">
        <div
          class="flex items-center h-8 gap-2 font-bold text-slate-500 grayscale hover:grayscale-0 transition-all duration-500">
          <SquareCheckBig class="w-6 h-6 text-primary-400" aria-hidden="true" />
          ONS Data
        </div>
        <div
          class="flex items-center h-8 gap-2 font-bold text-slate-500 grayscale hover:grayscale-0 transition-all duration-500">
          <Square class="w-6 h-6 text-slate-400" aria-hidden="true" />
          Adzuna API
          <span
            class="ml-1 text-2xs uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full"
            >Coming Soon</span
          >
        </div>
        <div
          class="flex items-center h-8 gap-2 font-bold text-slate-500 grayscale hover:grayscale-0 transition-all duration-500">
          <SquareCheckBig class="w-6 h-6 text-primary-400" aria-hidden="true" />
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
const isUSA = ref<boolean>(url.hostname.includes('.com'));

const title = computed(() =>
  isUSA.value
    ? 'Am I Underpaid? | Salary Comparison & Market Data Tool'
    : 'Am I Underpaid? | Salary Checker & Market Pay Calculator UK'
);

const description = computed(() =>
  isUSA.value
    ? 'Find out the average salary for your role in the USA. Compare your wage against live market data and BLS benchmarks to see if you are underpaid.'
    : 'Find out the average salary for your role. Compare your wage against live market data and official government benchmarks (ONS) to see if you are underpaid.'
);

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
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Am I Underpaid?',
          url: url.origin,
          description: description.value
        })
      )
    }
  ],
  link: [
    { rel: 'canonical', href: url.href },
    { rel: 'alternate', hreflang: 'en-gb', href: 'https://www.amiunderpaid.co.uk' },
    { rel: 'alternate', hreflang: 'en-us', href: 'https://www.amiunderpaid.com' },
    { rel: 'alternate', hreflang: 'x-default', href: 'https://www.amiunderpaid.com' }
  ]
});
</script>
