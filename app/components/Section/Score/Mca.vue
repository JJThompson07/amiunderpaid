<template>
  <div
    v-if="verdict"
    class="rounded-2xl shadow-xl border p-6 md:p-8 flex flex-col gap-6 items-center relative select-none transition-colors duration-500"
    :class="cardClasses">
    <header class="flex items-start justify-between w-full gap-4">
      <div>
        <h3 class="text-lg lg:text-2xl font-bold text-slate-900">{{ $t('mca.header') }}</h3>
      </div>
      <div
        class="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap"
        :class="badgeClasses">
        {{ verdict.label }}
      </div>
    </header>

    <div class="flex flex-col md:flex-row gap-8 md:gap-12 w-full items-center md:items-center">
      <div class="flex flex-col items-center justify-center shrink-0">
        <div class="relative w-40 h-40 md:w-48 md:h-48">
          <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="currentColor"
              stroke-width="8"
              class="text-slate-300/50" />
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
            <span class="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
              {{ animatedScore
              }}<span class="text-xl md:text-2xl text-slate-400 font-medium">/100</span>
            </span>
          </div>
        </div>
      </div>

      <div class="flex-1 w-full flex flex-col gap-3 justify-center">
        <p class="text-xs text-slate-500 uppercase tracking-wider font-bold">
          {{ $t('mca.confidence.label') }}
        </p>

        <div class="flex items-center gap-4">
          <div class="w-full max-w-xs h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-1000 ease-out"
              :class="confidenceBgColor"
              :style="{ width: `${(verdict.confidenceScore || 0) * 10}%` }"></div>
          </div>
          <span class="text-sm font-bold text-slate-700"
            >{{ verdict.confidenceScore || 0 }}/10</span
          >
        </div>

        <p class="text-sm text-slate-600 leading-relaxed font-medium mt-1">
          {{ confidenceDescription }}
        </p>
      </div>
    </div>

    <div class="w-full border-t border-slate-200/60 pt-4 mt-2">
      <button
        class="flex items-center justify-between w-full text-left font-bold text-slate-700 hover:text-slate-900 transition-colors group cursor-pointer"
        @click="showBreakdown = !showBreakdown">
        <span>{{ showBreakdown ? $t('mca.toggle.hide') : $t('mca.toggle.show') }}</span>
        <ChevronDown
          class="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-transform duration-300"
          :class="showBreakdown ? 'rotate-180' : ''" />
      </button>

      <div
        class="grid transition-all duration-300 ease-in-out"
        :class="showBreakdown ? 'grid-rows-[1fr] opacity-100 pt-4' : 'grid-rows-[0fr] opacity-0'">
        <div class="overflow-hidden px-4">
          <div class="flex flex-col gap-6 py-2 pr-1">
            <AmIChartRange
              v-if="verdict.livePercentile !== null"
              :percentile="verdict.livePercentile"
              mca
              :label="$t('mca.breakdowns.live.label')"
              :description="$t('mca.breakdowns.live.description')" />

            <AmIChartRange
              v-if="verdict.microPercentile !== null"
              :percentile="verdict.microPercentile"
              mca
              :label="$t('mca.breakdowns.micro.label')"
              :description="$t('mca.breakdowns.micro.description')" />

            <AmIChartRange
              :percentile="verdict.macroPercentile"
              mca
              :label="$t('mca.breakdowns.macro.label')"
              :description="$t('mca.breakdowns.macro.description')" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { ChevronDown } from 'lucide-vue-next'; // 👈 Added the icon import
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

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

// UI State
const showBreakdown = ref(false); // 👈 Controls the accordion

// ==========================================
// ⚙️ SVG RING MATH
// ==========================================
const radius = 40;
const circumference = 2 * Math.PI * radius;
const animatedScore = ref(0);

const dashOffset = computed(() => {
  const score = animatedScore.value;
  return circumference - (score / 100) * circumference;
});

// ==========================================
// 🎨 DYNAMIC TAILWIND STYLING
// ==========================================
const ringColor = computed(() => {
  const score = animatedScore.value;
  if (score >= 80) return '#25c25d';
  if (score >= 60) return '#2881cf';
  if (score >= 40) return '#d38e1f';
  return '#f34040';
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

// ==========================================
// 📊 CONFIDENCE BAR LOGIC
// ==========================================
const confidenceBgColor = computed(() => {
  const score = props.verdict?.confidenceScore || 0;
  if (score >= 8) return 'bg-positive-500'; // Green
  if (score >= 5) return 'bg-warning-500'; // Amber
  return 'bg-negative-500'; // Red
});

const confidenceDescription = computed(() => {
  const score = props.verdict?.confidenceScore || 0;
  if (score >= 8) return t('mca.confidence.desc_high');
  if (score >= 5) return t('mca.confidence.desc_medium');
  return t('mca.confidence.desc_low');
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
