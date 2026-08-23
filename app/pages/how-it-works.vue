<template>
  <div class="min-h-screen pt-24 pb-12 bg-slate-50">
    <SectionSharedBackdrop bg-from="from-slate-900/15" />
    <div class="max-w-5xl px-4 mx-auto relative">
      <!-- Header -->
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-black text-slate-900 md:text-4xl">
          {{ $t('how-it-works.heading') }}
        </h1>
        <p class="mt-4 text-lg text-slate-500">
          {{
            $siteBrand === 'benchmarkmyrole'
              ? $t('how-it-works.benchmark.description')
              : $t('how-it-works.description')
          }}
        </p>
      </div>

      <!-- Steps: one row on desktop so all three are visible without scrolling, with a
      light stagger on the middle card. `items-start` keeps each card at its own natural
      height instead of the grid default stretching every card flush to the same bottom
      edge, which was cancelling out the middle card's offset. Stacks to a single column
      on mobile. -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start">
        <!-- Step 1 -->
        <article class="relative flex flex-col p-6 shadow-sm rounded-3xl bg-primary-50">
          <span class="text-xs font-bold tracking-widest uppercase text-slate-500">{{
            $t('how-it-works.step-label', { n: 1 })
          }}</span>
          <h3 class="mt-1 mb-1 font-bold text-slate-900 text-lg">
            {{
              $siteBrand === 'benchmarkmyrole'
                ? $t('how-it-works.benchmark.step.1.heading')
                : $t('how-it-works.step.1.heading')
            }}
          </h3>
          <p class="text-sm text-slate-600 leading-relaxed">
            {{
              $siteBrand === 'benchmarkmyrole'
                ? $t('how-it-works.benchmark.step.1.body')
                : $t('how-it-works.step.1.body')
            }}
          </p>
          <img
            :src="stepIllustration(1)"
            :alt="
              $siteBrand === 'benchmarkmyrole'
                ? $t('how-it-works.benchmark.step.1.heading')
                : $t('how-it-works.step.1.heading')
            "
            class="w-full h-auto mt-4" />
        </article>

        <!-- Step 2 -->
        <article class="relative flex flex-col p-6 shadow-sm rounded-3xl bg-primary-50 md:mt-8">
          <span class="text-xs font-bold tracking-widest uppercase text-slate-500">{{
            $t('how-it-works.step-label', { n: 2 })
          }}</span>
          <h3 class="mt-1 mb-1 font-bold text-slate-900 text-lg">
            {{
              $siteBrand === 'benchmarkmyrole'
                ? $t('how-it-works.benchmark.step.2.heading')
                : $t('how-it-works.step.2.heading')
            }}
          </h3>
          <p class="text-sm text-slate-600 leading-relaxed">
            {{
              $siteBrand === 'benchmarkmyrole'
                ? $t('how-it-works.benchmark.step.2.body')
                : $t('how-it-works.step.2.body')
            }}
          </p>
          <img
            :src="stepIllustration(2)"
            :alt="
              $siteBrand === 'benchmarkmyrole'
                ? $t('how-it-works.benchmark.step.2.heading')
                : $t('how-it-works.step.2.heading')
            "
            class="w-full h-auto mt-4" />
        </article>

        <!-- Step 3 -->
        <article class="relative flex flex-col p-6 shadow-sm rounded-3xl bg-primary-50">
          <span class="text-xs font-bold tracking-widest uppercase text-slate-500">{{
            $t('how-it-works.step-label', { n: 3 })
          }}</span>
          <h3 class="mt-1 mb-1 font-bold text-slate-900 text-lg">
            {{
              $siteBrand === 'benchmarkmyrole'
                ? $t('how-it-works.benchmark.step.3.heading')
                : $t('how-it-works.step.3.heading')
            }}
          </h3>
          <p class="text-sm text-slate-600 leading-relaxed">
            {{
              $siteBrand === 'benchmarkmyrole'
                ? $t('how-it-works.benchmark.step.3.body')
                : $t('how-it-works.step.3.body')
            }}
          </p>
          <img
            :src="stepIllustration(3)"
            :alt="
              $siteBrand === 'benchmarkmyrole'
                ? $t('how-it-works.benchmark.step.3.heading')
                : $t('how-it-works.step.3.heading')
            "
            class="w-full h-auto mt-4" />
        </article>
      </div>

      <!-- CTA -->
      <div class="mt-10 text-center">
        <NuxtLink to="/">
          <AmIButton title="Go to salary search" size="lg">{{
            $siteBrand === 'amiunderpaid'
              ? $t('buttons.check-salary-now')
              : $t('buttons.benchmark.check-now')
          }}</AmIButton>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $siteBrand } = useNuxtApp();
const { t } = useI18n();

const stepIllustration = (step: 1 | 2 | 3): string =>
  `/${$siteBrand === 'benchmarkmyrole' ? 'benchmarkmyrole' : 'amiunderpaid'}-how-it-works-${step}.svg`;

useSeoMeta({
  title:
    $siteBrand === 'benchmarkmyrole'
      ? t('meta.how-it-works.benchmark.title')
      : t('meta.how-it-works.title'),
  description:
    $siteBrand === 'benchmarkmyrole'
      ? t('meta.how-it-works.benchmark.description')
      : t('meta.how-it-works.description')
});
</script>
