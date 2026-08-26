<template>
  <section class="max-w-5xl px-4 pt-12 mx-auto select-none">
    <div
      class="flex flex-col items-center gap-6 p-8 text-center bg-white/50 backdrop-blur-xl border border-slate-200/60 md:p-10 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 md:flex-row md:text-left md:justify-between">
      <div>
        <h3 class="text-2xl font-black tracking-tight text-secondary-950">
          {{ $t('landing.industryTrendsCta.heading') }}
        </h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-600">
          {{ $t('landing.industryTrendsCta.body') }}
        </p>
      </div>
      <NuxtLink to="/insights/industry-trends" class="shrink-0">
        <AmIButton
          bg-colour="bg-primary-500"
          animation-colour="bg-primary-400"
          text-colour="text-white">
          {{ $t('landing.industryTrendsCta.cta') }}
        </AmIButton>
      </NuxtLink>
    </div>
  </section>
</template>
