<template>
  <div class="min-h-screen pt-24 pb-12 bg-slate-50">
    <SectionSharedBackdrop bg-from="from-slate-900/15" />
    <div class="max-w-3xl px-4 mx-auto relative">
      <div class="mb-10 text-center">
        <h1 class="text-3xl font-black text-slate-900 md:text-4xl">{{ $t('mca.header') }}</h1>
        <p class="mt-4 text-lg text-slate-500">{{ $t('mca.explainer.intro') }}</p>
      </div>

      <!-- The three data pillars that feed every score -->
      <section
        aria-label="How the score is built"
        class="grid grid-cols-1 gap-4 mb-10 sm:grid-cols-3">
        <div
          v-for="pillar in pillars"
          :key="pillar"
          class="p-5 bg-white border shadow-sm rounded-2xl border-slate-200">
          <h2 class="text-sm font-bold text-slate-900">
            {{ $t(`mca.breakdowns.${pillar}.label`) }}
          </h2>
          <p class="mt-1 text-xs leading-relaxed text-slate-500">
            {{ $t(`mca.breakdowns.${pillar}.description`) }}
          </p>
        </div>
      </section>

      <p class="mb-10 text-sm italic leading-relaxed text-center text-slate-400">
        {{ $t('mca.explainer.algorithmNote') }}
      </p>

      <!-- Bracket breakdown -->
      <h2 class="mb-4 text-xl font-bold text-slate-900">{{ $t('mca.breakdown') }}</h2>
      <section
        aria-label="MCA Score brackets"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="bracket in brackets"
          :key="bracket"
          class="flex flex-col p-6 bg-white border shadow-sm rounded-2xl"
          :class="bracketStyles[bracket].border">
          <div class="flex items-center justify-between mb-3">
            <span
              class="px-3 py-1 rounded-full text-xs font-bold"
              :class="bracketStyles[bracket].badge">
              {{ $t(`mca.labels.${bracket}`) }}
            </span>
            <span class="text-xs font-bold text-slate-400">{{
              $t(`mca.brackets.${bracket}.range`)
            }}</span>
          </div>
          <p class="text-sm leading-relaxed text-slate-600">
            {{ $t(`mca.brackets.${bracket}.advice`) }}
          </p>
        </article>
      </section>

      <!-- CTA -->
      <div class="mt-16 text-center">
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

const pillars = ['micro', 'macro', 'live'] as const;

// The 5 real MCA brackets, matching the thresholds in shared/utils/formatter.ts
// (score >= 80 leader, >= 60 strong, >= 40 competitive, >= 25 below, else review).
const brackets = ['leader', 'strong', 'competitive', 'below', 'review'] as const;

const bracketStyles: Record<(typeof brackets)[number], { badge: string; border: string }> = {
  leader: { badge: 'bg-positive-200/50 text-positive-700', border: 'border-positive-100' },
  strong: { badge: 'bg-neutral-200/50 text-neutral-700', border: 'border-neutral-200' },
  competitive: { badge: 'bg-warning-200/50 text-warning-700', border: 'border-warning-200' },
  below: { badge: 'bg-negative-200/50 text-negative-700', border: 'border-negative-100' },
  review: { badge: 'bg-negative-300/60 text-negative-800', border: 'border-negative-200' }
};

useSeoMeta({
  title:
    $siteBrand === 'benchmarkmyrole'
      ? t('meta.mca-score.benchmark.title')
      : t('meta.mca-score.title'),
  description:
    $siteBrand === 'benchmarkmyrole'
      ? t('meta.mca-score.benchmark.description')
      : t('meta.mca-score.description')
});
</script>
