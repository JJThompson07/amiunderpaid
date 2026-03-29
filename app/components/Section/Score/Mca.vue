<template>
  <div
    v-if="verdict"
    class="rounded-2xl shadow-xl border p-6 md:p-8 flex flex-col gap-3 items-center relative select-none"
    :class="cardClasses">
    <header class="flex items-start justify-between w-full gap-4">
      <div>
        <h3 class="text-xl lg:text-2xl font-black text-slate-900">Market Compensation Alignment</h3>
        <p class="text-xs text-slate-500 uppercase tracking-wider font-bold mt-1">
          Your MCA Score Breakdown
        </p>
      </div>
      <div
        class="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap"
        :class="badgeClasses">
        {{ verdict.label }}
      </div>
    </header>
    <div class="flex flex-col md:flex-row gap-3 md:gap-8">
      <div class="flex flex-col items-center justify-center shrink-0 w-full md:w-auto">
        <div class="relative w-40 h-40 md:w-48 md:h-48">
          <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="currentColor"
              stroke-width="8"
              class="text-slate-200/50" />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              :stroke="ringColor"
              stroke-width="8"
              stroke-linecap="round"
              class="transition-all duration-1000 ease-out drop-shadow-sm"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="dashOffset" />
          </svg>

          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-4xl md:text-5xl font-black text-slate-900">
              {{ animatedScore
              }}<span class="text-lg md:text-xl text-slate-400 font-medium">/100</span>
            </span>
          </div>
        </div>
      </div>

      <div class="flex-1 w-full flex flex-col gap-3">
        <ul class="flex flex-col gap-3 mt-1">
          <li
            v-for="(point, index) in verdict.comparisonPoints"
            :key="index"
            class="flex items-start gap-3 text-slate-600 leading-relaxed">
            <div class="mt-2 w-1.5 h-1.5 rounded-full shrink-0" :class="dotClass"></div>
            <span class="text-xs" v-html="point"></span>
          </li>
        </ul>

        <div
          class="mt-2 p-4 rounded-xl text-sm border flex items-center gap-2"
          :class="analysisBoxClasses">
          <span
            v-html="
              `<strong>Analysis:</strong> A base salary of ${currencySymbol}${userSalary.toLocaleString()} places you in the <strong>${verdict.percentileRank}th percentile</strong> for ${matchedTitle} ${location ? 'in ' + location : 'nationally'}.`
            "></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';

const props = defineProps({
  verdict: {
    type: Object,
    required: false,
    default: null
  },
  userSalary: { type: Number, required: true },
  currencySymbol: { type: String, default: '£' },
  matchedTitle: { type: String, required: true },
  location: { type: String, default: '' }
});

// SVG Ring Math
const radius = 40;
const circumference = 2 * Math.PI * radius;
const animatedScore = ref(0);

const dashOffset = computed(() => {
  const score = animatedScore.value;
  return circumference - (score / 100) * circumference;
});

// ==========================================
// 🎨 DYNAMIC TAILWIND STYLING (MATCHING RESULT.VUE)
// ==========================================

const ringColor = computed(() => {
  const score = animatedScore.value;
  if (score >= 80) return '#25c25d'; // Positive / Emerald
  if (score >= 60) return '#2881cf'; // Neutral / Slate
  if (score >= 40) return '#d38e1f'; // Warning / Amber
  return '#f34040'; // Negative / Red
});

const cardClasses = computed(() => {
  const score = props.verdict?.score || 0;
  if (score >= 80)
    return 'bg-linear-to-b from-positive-50/75 via-white to-white border-positive-100';
  if (score >= 60)
    return 'bg-linear-to-b from-neutral-100/75 via-white to-white border-neutral-200';
  if (score >= 40) return 'bg-linear-to-b from-warning-50/75 via-white to-white border-warning-200';
  return 'bg-linear-to-b from-negative-50/75 via-white to-white border-negative-100';
});

const badgeClasses = computed(() => {
  const score = props.verdict?.score || 0;
  if (score >= 80) return 'bg-positive-200/50 text-positive-700';
  if (score >= 60) return 'bg-neutral-200/50 text-neutral-700';
  if (score >= 40) return 'bg-warning-200/50 text-warning-700';
  return 'bg-negative-200/50 text-negative-700';
});

const dotClass = computed(() => {
  const score = props.verdict?.score || 0;
  if (score >= 80) return 'bg-positive-500';
  if (score >= 60) return 'bg-neutral-400';
  if (score >= 40) return 'bg-warning-500';
  return 'bg-negative-500';
});

const analysisBoxClasses = computed(() => {
  const score = props.verdict?.score || 0;
  if (score >= 80) return 'bg-positive-50/50 border-positive-100 text-positive-800';
  if (score >= 60) return 'bg-slate-50 border-slate-200 text-slate-800';
  if (score >= 40) return 'bg-warning-50/50 border-warning-100 text-warning-800';
  return 'bg-negative-50/50 border-negative-100 text-negative-800';
});

// ==========================================
// ⚡ ANIMATION TRIGGER
// ==========================================
const triggerAnimation = () => {
  if (props.verdict?.score) {
    animatedScore.value = 0;
    setTimeout(() => {
      animatedScore.value = props.verdict.score;
    }, 100);
  }
};

onMounted(() => triggerAnimation());
watch(
  () => props.verdict,
  () => triggerAnimation(),
  { deep: true }
);
</script>
