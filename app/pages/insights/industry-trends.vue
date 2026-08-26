<template>
  <div class="min-h-screen pt-24 pb-12">
    <SectionSharedBackdrop bg-from="from-slate-900/15" />

    <section class="relative px-4 pb-12">
      <div class="max-w-5xl mx-auto">
        <div class="mb-10 text-center">
          <h1 class="text-3xl font-black text-slate-900 md:text-4xl">
            {{ $t('insights.header') }}
          </h1>
          <p class="max-w-2xl mx-auto mt-4 text-lg text-slate-500">
            {{ $t('insights.intro') }}
          </p>
        </div>

        <div class="p-6 mb-8 bg-white border shadow-sm rounded-3xl border-slate-200">
          <div v-if="loading" class="flex items-center justify-center h-125">
            <AmILoader :message="$t('insights.loading')" />
          </div>
          <div
            v-else-if="error"
            class="flex items-center justify-center text-sm font-bold h-125 text-slate-400">
            {{ $t('insights.error') }}
          </div>
          <div
            v-else-if="industries.length === 0"
            class="flex items-center justify-center text-sm font-bold h-125 text-slate-400">
            {{ $t('insights.empty') }}
          </div>
          <div v-else ref="chartContainer" class="w-full h-125" />
        </div>

        <div
          v-if="!loading && !error && industries.length > 0"
          class="p-6 bg-white border shadow-sm rounded-3xl border-slate-200">
          <div class="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-bold rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                @click="selectAll">
                {{ $t('insights.controls.selectAll') }}
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-bold rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                @click="clearAll">
                {{ $t('insights.controls.clearAll') }}
              </button>
            </div>

            <div class="flex items-center gap-2">
              <label for="trends-time-range" class="text-xs font-bold text-slate-400">
                {{ $t('insights.controls.timeRange.label') }}
              </label>
              <select
                id="trends-time-range"
                v-model="timeRange"
                class="px-3 py-1.5 text-xs font-bold border rounded-full text-slate-600 border-slate-200 bg-white">
                <option value="6">{{ $t('insights.controls.timeRange.last6') }}</option>
                <option value="12">{{ $t('insights.controls.timeRange.last12') }}</option>
                <option value="all">{{ $t('insights.controls.timeRange.allTime') }}</option>
              </select>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              v-for="industry in industries"
              :key="industry.categoryTag"
              type="button"
              class="px-3 py-1.5 text-xs font-bold rounded-full border transition-colors"
              :class="
                selectedIndustries.includes(industry.categoryTag)
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
              "
              @click="toggleIndustry(industry.categoryTag)">
              {{ industry.label }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts';
import type { IndustryTrendEntry, IndustryTrendsResponse } from '~~/shared/utils/market-data';

const { t } = useI18n();
const { currentCountry } = useRegion();
const { $siteBrand } = useNuxtApp();

useSeoMeta({
  title:
    $siteBrand === 'benchmarkmyrole'
      ? t('meta.industry-trends.benchmark.title')
      : t('meta.industry-trends.title'),
  description:
    $siteBrand === 'benchmarkmyrole'
      ? t('meta.industry-trends.benchmark.description')
      : t('meta.industry-trends.description')
});

const loading = ref(true);
const error = ref(false);
const industries = ref<IndustryTrendEntry[]>([]);
const selectedIndustries = ref<string[]>([]);
const timeRange = ref<'6' | '12' | 'all'>('12');

const chartContainer = ref<HTMLElement | null>(null);
const chart = shallowRef<echarts.ECharts | null>(null);

const getThemeColor = (cssVar: string, fallback: string): string => {
  if (!import.meta.client) {
    return fallback;
  }
  const val = getComputedStyle(document.body).getPropertyValue(cssVar).trim();
  return val || fallback;
};

const buildPalette = (): string[] => [
  getThemeColor('--color-primary-500', '#1cabb0'),
  getThemeColor('--color-secondary-500', '#3c83bb'),
  getThemeColor('--color-positive-500', '#25c25d'),
  getThemeColor('--color-warning-500', '#d38e1f'),
  getThemeColor('--color-negative-500', '#f34040'),
  getThemeColor('--color-neutral-500', '#2881cf'),
  getThemeColor('--color-primary-700', '#0f6a6d'),
  getThemeColor('--color-secondary-700', '#1f4a6b')
];

const monthsBack = computed<number | null>(() => {
  if (timeRange.value === '6') {
    return 6;
  }
  if (timeRange.value === '12') {
    return 12;
  }
  return null;
});

const visibleIndustries = computed<IndustryTrendEntry[]>(() =>
  industries.value.filter((industry) => selectedIndustries.value.includes(industry.categoryTag))
);

const allMonths = computed<string[]>(() => {
  const months = new Set<string>();
  for (const industry of visibleIndustries.value) {
    for (const point of industry.history) {
      months.add(point.month);
    }
  }
  const sorted = [...months].sort();
  const limit = monthsBack.value;
  return limit ? sorted.slice(-limit) : sorted;
});

const toggleIndustry = (categoryTag: string): void => {
  const idx = selectedIndustries.value.indexOf(categoryTag);
  if (idx === -1) {
    selectedIndustries.value.push(categoryTag);
  } else {
    selectedIndustries.value.splice(idx, 1);
  }
};

const selectAll = (): void => {
  selectedIndustries.value = industries.value.map((industry) => industry.categoryTag);
};

const clearAll = (): void => {
  selectedIndustries.value = [];
};

const renderChart = (): void => {
  if (!chart.value) {
    return;
  }

  const palette = buildPalette();
  const months = allMonths.value;
  const slate400 = getThemeColor('--color-slate-400', '#94a3b8');
  const slate100 = getThemeColor('--color-slate-100', '#f1f5f9');

  chart.value.setOption(
    {
      color: palette,
      animationDuration: 1500,
      animationEasing: 'cubicOut',
      grid: { left: 48, right: 24, top: 24, bottom: 32 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderWidth: 0,
        borderRadius: 12,
        padding: 12,
        textStyle: { color: '#1e293b', fontFamily: 'inherit' },
        extraCssText: 'box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1);'
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: slate400 }
      },
      yAxis: {
        type: 'value',
        name: t('insights.chart.yAxisLabel'),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: slate400 },
        splitLine: { lineStyle: { type: 'dashed', color: slate100 } }
      },
      series: visibleIndustries.value.map((industry) => {
        const byMonth = new Map(industry.history.map((point) => [point.month, point.average]));
        return {
          name: industry.label,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: months.map((month) => byMonth.get(month) ?? null),
          connectNulls: true
        };
      })
    },
    true
  );
};

watch([visibleIndustries, timeRange], renderChart);

onMounted(async () => {
  try {
    const country = currentCountry.value === 'USA' ? 'us' : 'gb';
    const response = await $fetch<IndustryTrendsResponse>('/api/market-data/industry-trends', {
      params: { country }
    });
    industries.value = response.industries;
    selectedIndustries.value = response.industries.map((industry) => industry.categoryTag);
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }

  await nextTick();
  if (chartContainer.value) {
    chart.value = echarts.init(chartContainer.value);
    renderChart();
    window.addEventListener('resize', handleResize);
  }
});

const handleResize = (): void => {
  chart.value?.resize();
};

onBeforeUnmount(() => {
  if (chart.value) {
    chart.value.dispose();
  }
  window.removeEventListener('resize', handleResize);
});
</script>
