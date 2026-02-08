<template>
  <div class="min-h-screen pt-24 pb-12 bg-slate-50">
    <div class="max-w-3xl px-4 mx-auto">
      <div class="mb-12 text-center">
        <h1 class="text-3xl font-black text-slate-900 md:text-4xl">Privacy Policy</h1>
        <p class="mt-4 text-lg text-slate-500">Last updated: February 2026</p>
      </div>

      <div
        class="p-8 space-y-8 bg-white border shadow-xl rounded-3xl border-slate-200 text-slate-600 leading-relaxed">
        <section>
          <h2 class="text-xl font-bold text-slate-900 mb-4">1. Data Collection & Usage</h2>
          <p>
            We prioritize your privacy. "Am I Underpaid?" does not require you to create an account
            or provide personal identification to use our salary benchmarking tools.
          </p>
          <p class="mt-2">
            The salary information and job titles you enter into our calculator are processed to
            provide you with a comparison against our database. We do not store your specific entry
            linked to your personal identity.
          </p>
          <p class="mt-2">
            We use Google Analytics to anonymously track website usage and improve our services.
            This data is aggregated and cannot be used to identify you personally.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-bold text-slate-900 mb-4">2. Our Data Sources</h2>
          <p>
            Our benchmarking data is aggregated from publicly available government statistics and
            real-time market data to ensure accuracy.
          </p>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li>
              <strong>ONS (Office for National Statistics):</strong> Used for UK job titles and
              salary benchmarks.
            </li>
            <li>
              <strong>BLS (Bureau of Labor Statistics):</strong> Used for USA job titles and salary
              benchmarks.
            </li>
            <li>
              <strong>Adzuna Intelligence:</strong> Used for real-time job listing data.
              <span
                class="font-bold text-secondary-600 uppercase text-[10px] tracking-wide bg-secondary-50 px-2 py-0.5 rounded-full mr-1"
                >Coming Soon</span
              >
            </li>
          </ul>
        </section>

        <section>
          <h2 class="text-xl font-bold text-slate-900 mb-4">3. Affiliate Disclosure</h2>
          <p>
            This website contains affiliate links. If you click on a link for a third-party service
            (such as CV writing services or negotiation courses) and make a purchase, we may earn a
            commission at no extra cost to you.
          </p>
          <p class="mt-2">
            We believe the only way to successfully progress in your career is to invest in
            yourself, and we only recommend services that provide genuine value to our users. We
            carefully vet all affiliate partners to ensure they meet our standards for quality and
            relevance to career development.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Privacy Policy | Am I Underpaid?',
  description: 'Privacy policy, data sources, and affiliate disclosure for Am I Underpaid?'
});
</script>
