<template>
  <div class="min-h-screen pt-24 pb-12">
    <SectionSharedBackdrop bg-from="from-slate-900/15" />

    <!-- Hero + pillars -->
    <section class="relative px-4 pb-12">
      <div class="max-w-5xl mx-auto">
        <div class="mb-10 text-center">
          <h1 class="text-3xl font-black text-slate-900 md:text-4xl">{{ $t('mca.header') }}</h1>
          <p class="max-w-2xl mx-auto mt-4 text-lg text-slate-500">
            {{ $t('mca.explainer.intro') }}
          </p>
        </div>

        <!-- The three data pillars that feed every score -->
        <section
          aria-label="How the score is built"
          class="grid grid-cols-1 gap-4 mb-10 sm:grid-cols-3">
          <div
            v-for="pillar in pillars"
            :key="pillar"
            class="p-6 shadow-sm transition-shadow rounded-3xl bg-primary-50 hover:shadow-md">
            <h2 class="text-sm font-bold text-slate-900">
              {{ $t(`mca.breakdowns.${pillar}.label`) }}
            </h2>
            <p class="mt-1 text-xs leading-relaxed text-slate-500">
              {{ $t(`mca.breakdowns.${pillar}.description`) }}
            </p>
          </div>
        </section>

        <p class="text-sm italic leading-relaxed text-center text-slate-400">
          {{ $t('mca.explainer.algorithmNote') }}
        </p>
      </div>
    </section>

    <!-- Bracket breakdown -->
    <section class="relative px-4 py-12 bg-white">
      <div class="max-w-5xl mx-auto">
        <h2 class="mb-4 text-xl font-bold text-slate-900">{{ $t('mca.breakdown') }}</h2>

        <section
          aria-label="MCA Score brackets"
          class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="bracket in brackets"
            :key="bracket"
            class="flex flex-col p-6 shadow-sm transition-shadow rounded-3xl hover:shadow-md"
            :class="bracketStyles[bracket].bg">
            <div class="flex items-center justify-between mb-4">
              <div class="flex flex-col items-start gap-2">
                <span
                  class="px-3 py-1 rounded-full text-xs font-bold"
                  :class="bracketStyles[bracket].badge">
                  {{ $t(`mca.labels.${bracket}`) }}
                </span>
                <span class="text-xs font-bold text-slate-400">{{
                  $t(`mca.brackets.${bracket}.range`)
                }}</span>
              </div>
              <TargetIcon :bracket="bracket" class="shrink-0" />
            </div>

            <!-- Inline "you are here" spectrum bar for this bracket -->
            <div
              class="flex w-full h-2 mt-3 mb-4 overflow-hidden rounded-full gap-0.5"
              role="img"
              :aria-label="$t(`mca.labels.${bracket}`)">
              <div
                v-for="segment in spectrumSegments"
                :key="segment.bracket"
                :class="[segment.width, segmentColor(segment, bracket)]" />
            </div>

            <ul class="pl-5 mt-2 text-sm leading-relaxed list-disc text-slate-700 space-y-2">
              <li>{{ $t(`mca.brackets.${bracket}.advice.candidate`) }}</li>
              <li>{{ $t(`mca.brackets.${bracket}.advice.employer`) }}</li>
            </ul>
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
    </section>
  </div>
</template>

<script setup lang="ts">
const { $siteBrand } = useNuxtApp();
const { t } = useI18n();

const pillars = ['micro', 'macro', 'live'] as const;

// The 5 real MCA brackets, matching the thresholds in shared/utils/formatter.ts
// (score >= 80 leader, >= 60 strong, >= 40 competitive, >= 25 below, else review).
const brackets = ['leader', 'strong', 'competitive', 'below', 'review'] as const;

const bracketStyles: Record<(typeof brackets)[number], { badge: string; bg: string }> = {
  leader: { badge: 'bg-positive-200/50 text-positive-700', bg: 'bg-positive-50' },
  strong: { badge: 'bg-neutral-200/50 text-neutral-700', bg: 'bg-neutral-50' },
  competitive: { badge: 'bg-warning-200/50 text-warning-700', bg: 'bg-warning-50' },
  below: { badge: 'bg-negative-200/50 text-negative-700', bg: 'bg-negative-50/50' },
  review: { badge: 'bg-negative-300/60 text-negative-800', bg: 'bg-negative-100/50' }
};

// Ordered low-to-high across the 1-99 range, widths matching the real bracket boundaries.
const spectrumSegments: {
  bracket: (typeof brackets)[number];
  width: string;
  activeColor: string;
}[] = [
  { bracket: 'review', width: 'w-[24%]', activeColor: 'bg-negative-400' },
  { bracket: 'below', width: 'w-[15%]', activeColor: 'bg-negative-300' },
  { bracket: 'competitive', width: 'w-[20%]', activeColor: 'bg-warning-400' },
  { bracket: 'strong', width: 'w-[20%]', activeColor: 'bg-neutral-400' },
  { bracket: 'leader', width: 'w-[21%]', activeColor: 'bg-positive-400' }
];

const segmentColor = (
  segment: (typeof spectrumSegments)[number],
  activeBracket: (typeof brackets)[number]
): string => (segment.bracket === activeBracket ? segment.activeColor : 'bg-slate-200/50');

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
