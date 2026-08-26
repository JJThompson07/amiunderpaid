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
              class="px-3 py-1.5 text-xs font-bold rounded-full border border-transparent cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:shadow-none"
              :class="
                selectedIndustries.includes(industry.categoryTag)
                  ? 'bg-(--pill-bg) text-(--pill-text) hover:brightness-95'
                  : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500'
              "
              :style="
                selectedIndustries.includes(industry.categoryTag)
                  ? {
                      '--pill-bg': industryScaleMap.get(industry.categoryTag)?.['100'],
                      '--pill-text': industryScaleMap.get(industry.categoryTag)?.['800']
                    }
                  : {}
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
import { generateColorScale } from '~~/shared/utils/color';
import type { ColorScale } from '~~/shared/utils/color';
import type { IndustryTrendEntry, IndustryTrendsResponse } from '~~/shared/utils/market-data';

const { t } = useI18n();
const { currentCountry, currencySymbol } = useRegion();
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

// 30-color categorical palette defined in app/assets/css/main.css (--chart-1..30,
// plain :root custom properties, not Tailwind @theme tokens -- see that file's
// comment for why): a systematic hue rotation at a fixed moderate saturation/
// lightness band, so colors stay distinguishable and accessible without going
// neon or washed-out.
const CHART_PALETTE_SIZE = 30;
const buildPalette = (): string[] =>
  Array.from({ length: CHART_PALETTE_SIZE }, (_, i) =>
    getThemeColor(`--chart-${i + 1}`, '#64748b')
  );

// Stable per-industry color scale, keyed by each industry's position in the
// FULL list (not the currently-visible subset) -- otherwise toggling one
// industry off would shift every other industry's index and reassign its
// color, so a line's color would keep changing as you toggle others on/off,
// and the legend pill could never reliably match its line.
//
// Each palette entry is expanded into a full 50-900 tonal scale (see
// shared/utils/color.ts) so the pill can use the same light-tint-background/
// dark-text badge treatment this app already uses elsewhere (e.g. the MCA
// bracket badges), rather than a flat single-tone pill -- the chart line
// itself uses the scale's 500 stop.
const industryScaleMap = computed<Map<string, ColorScale>>(() => {
  const palette = buildPalette();
  const map = new Map<string, ColorScale>();
  industries.value.forEach((industry, index) => {
    map.set(industry.categoryTag, generateColorScale(palette[index % palette.length]!));
  });
  return map;
});

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

// The subset of ECharts' axis-trigger tooltip params this formatter actually
// reads, kept minimal and local rather than depending on echarts' own
// (verbose) formatter param types.
type TooltipRowParam = {
  marker?: string;
  seriesName?: string;
  value?: number | string | null;
  axisValueLabel?: string;
  axisValue?: string;
};

const TOOLTIP_MAX_ROWS = 10;

const formatTooltip = (params: unknown): string => {
  if (!Array.isArray(params) || params.length === 0) {
    return '';
  }

  const rows = params as TooltipRowParam[];
  const label = rows[0]?.axisValueLabel ?? rows[0]?.axisValue ?? '';

  // Rank by value (highest average salary first) rather than series order --
  // a more useful "top 10" when there are more industries than fit cleanly.
  const sorted = [...rows]
    .filter((row) => typeof row.value === 'number')
    .sort((a, b) => (b.value as number) - (a.value as number));

  const visible = sorted.slice(0, TOOLTIP_MAX_ROWS);
  const remaining = sorted.length - visible.length;

  const rowsHtml = visible
    .map((row) => {
      const value =
        typeof row.value === 'number'
          ? `${currencySymbol.value}${Math.round(row.value).toLocaleString()}`
          : '';
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:4px;">
        <span>${row.marker ?? ''}${row.seriesName ?? ''}</span>
        <strong>${value}</strong>
      </div>`;
    })
    .join('');

  const moreHtml =
    remaining > 0
      ? `<div style="margin-top:6px;color:#94a3b8;font-size:11px;">+${remaining} more</div>`
      : '';

  return `<div style="font-weight:700;">${label}</div>${rowsHtml}${moreHtml}`;
};

const renderChart = (): void => {
  if (!chart.value) {
    return;
  }

  const months = allMonths.value;
  const slate400 = getThemeColor('--color-slate-400', '#94a3b8');
  const slate100 = getThemeColor('--color-slate-100', '#f1f5f9');

  chart.value.setOption(
    {
      animationDuration: 1500,
      animationEasing: 'cubicOut',
      grid: { left: 48, right: 24, top: 24, bottom: 32 },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: '#ffffff',
        borderWidth: 0,
        borderRadius: 12,
        padding: 12,
        textStyle: { color: '#1e293b', fontFamily: 'inherit' },
        extraCssText: 'box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1);',
        // A CSS max-height/scroll doesn't actually work here: this tooltip
        // follows the cursor (it's not a fixed overlay), so moving the mouse
        // toward a scrollbar just moves the tooltip itself instead of
        // scrolling its content. With many series selected, cap the rows
        // shown to the top 10 by value and summarize the rest instead.
        formatter: (params: unknown): string => formatTooltip(params)
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
        const color = industryScaleMap.value.get(industry.categoryTag)?.['500'];
        return {
          name: industry.label,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          color,
          lineStyle: { color },
          itemStyle: { color },
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
