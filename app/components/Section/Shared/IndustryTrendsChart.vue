<template>
  <div>
    <div
      class="p-6 mb-8 bg-white border shadow-sm rounded-3xl border-slate-200"
      :style="cardBackgroundStyle">
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
      <div class="flex flex-wrap items-start gap-4">
        <template v-if="!initialIndustryTag">
          <div class="flex items-center gap-2 shrink-0 pt-2">
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

          <div class="flex-1 min-w-50">
            <AmIInputSelect
              v-model="selectedIndustries"
              compact
              :options="industryOptions"
              :chip-color-for="chipColorFor"
              :placeholder="$t('insights.controls.industriesPlaceholder')" />
          </div>
        </template>

        <div class="flex items-center gap-2 shrink-0 pt-2 ml-auto">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts';
import { generateColorScale } from '~~/shared/utils/color';
import type { AutocompleteOption } from '~/components/AmI/Input/Select.vue';
import type { ColorScale } from '~~/shared/utils/color';
import type { IndustryTrendEntry } from '~~/shared/utils/market-data';

// When set (the pSEO spoke page, keyed by categoryTag), only this industry is
// toggled on by default so visitors immediately see its trendline in
// isolation -- they can still toggle others on for comparison. When omitted
// (the hub page), the default falls back to the top N by real lookup
// activity, see DEFAULT_SELECTED_INDUSTRY_COUNT below.
const props = defineProps<{
  initialIndustryTag?: string;
}>();

const { t } = useI18n();
const { currencySymbol } = useRegion();
const { industries, loading, error } = useIndustryTrends();

const selectedIndustries = ref<string[]>([]);
const timeRange = ref<'6' | '12' | 'all'>('12');
const hasInitializedSelection = ref(false);

const chartContainer = ref<HTMLElement | null>(null);
const chart = shallowRef<echarts.ECharts | null>(null);

const DEFAULT_SELECTED_INDUSTRY_COUNT = 10;

// history is chronologically sorted (see formatHistoryMonths on the server),
// so the last point is the most recent month's average.
const latestAverageSalary = (industry: IndustryTrendEntry): number =>
  industry.history.at(-1)?.average ?? 0;

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

// Trial: on the spoke page (initialIndustryTag set), tint the chart card with
// a subtle gradient in that industry's own colour -- using the scale's
// lightest stop (50) so it stays a barely-there wash behind the white card
// rather than competing with the chart lines/axis labels for contrast.
const cardBackgroundStyle = computed<{ background: string }>(() => {
  const scale = props.initialIndustryTag
    ? industryScaleMap.value.get(props.initialIndustryTag)
    : undefined;
  return { background: scale ? `linear-gradient(135deg, ${scale['50']} 0%, #ffffff 55%)` : '' };
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

const industryOptions = computed<AutocompleteOption[]>(() =>
  industries.value.map((industry) => ({ value: industry.categoryTag, label: industry.label }))
);

// Colours each selected-industry chip in the AmIInputSelect multiselect to
// match its line on the graph, using the same 50-900 scale the chart itself
// reads from -- see the industryScaleMap comment above.
const chipColorFor = (
  categoryTag: string
): { bg: string; text: string; border: string } | undefined => {
  const scale = industryScaleMap.value.get(categoryTag);
  if (!scale) {
    return undefined;
  }
  return { bg: scale['100'], text: scale['800'], border: scale['200'] };
};

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
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:4px;font-size:12px;">
        <span>${row.marker ?? ''}${row.seriesName ?? ''}</span>
        <strong>${value}</strong>
      </div>`;
    })
    .join('');

  const moreHtml =
    remaining > 0
      ? `<div style="margin-top:6px;color:#94a3b8;font-size:11px;">+${remaining} more</div>`
      : '';

  return `<div style="font-weight:700;font-size:13px;">${label}</div>${rowsHtml}${moreHtml}`;
};

// The y-axis snaps to the nearest whole £10k below the lowest plotted value
// and above the highest, so a tight cluster of high salaries (e.g. all above
// £40k) doesn't get squashed against a y-axis that's always forced down to 0.
const Y_AXIS_STEP = 10_000;

const renderChart = (): void => {
  if (!chart.value) {
    return;
  }

  const months = allMonths.value;
  const slate400 = getThemeColor('--color-slate-400', '#94a3b8');
  const slate200 = getThemeColor('--color-slate-200', '#e2e8f0');

  const series = visibleIndustries.value.map((industry) => {
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
  });

  const plottedValues = series
    .flatMap((s) => s.data)
    .filter((value): value is number => typeof value === 'number');
  const yAxisMin =
    plottedValues.length > 0
      ? Math.max(0, Math.floor(Math.min(...plottedValues) / Y_AXIS_STEP) * Y_AXIS_STEP)
      : undefined;
  const yAxisMax =
    plottedValues.length > 0
      ? Math.ceil(Math.max(...plottedValues) / Y_AXIS_STEP) * Y_AXIS_STEP
      : undefined;

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
        textStyle: { color: '#1e293b', fontFamily: 'inherit', fontSize: 12 },
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
        min: yAxisMin,
        max: yAxisMax,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: slate400 },
        splitLine: { lineStyle: { type: 'dashed', color: slate200 } }
      },
      series
    },
    true
  );
};

watch([visibleIndustries, timeRange], renderChart);

// Seeds the default selection as soon as the (SSR-fetched or client-fetched)
// industries list first becomes non-empty. Also re-runs whenever
// initialIndustryTag itself changes -- the spoke page's top-right single
// select switches between two industry URLs client-side, which Vue Router
// reuses this component instance across (same route record) rather than
// remounting it, so initialIndustryTag is the only thing that changes.
// hasInitializedSelection guards just the hub's one-time default-top-N pick,
// so a later user clearAll() isn't immediately overwritten by this watcher
// re-firing for an unrelated reason.
watch(
  [industries, (): string | undefined => props.initialIndustryTag],
  ([list, tag]) => {
    if (list.length === 0) {
      return;
    }

    if (tag) {
      if (list.some((i) => i.categoryTag === tag)) {
        selectedIndustries.value = [tag];
      }
      return;
    }

    if (hasInitializedSelection.value) {
      return;
    }
    hasInitializedSelection.value = true;

    // Default to the industries most looked-up by real users (see
    // lookupCount on IndustryTrendEntry) rather than showing all of them at
    // once. Ties on lookupCount -- most commonly ties at 0, e.g. industries
    // with no real search data yet -- are broken by highest current average
    // salary, so the remaining default slots are filled with the most
    // notable industries rather than arbitrary order.
    selectedIndustries.value = [...list]
      .sort(
        (a, b) => b.lookupCount - a.lookupCount || latestAverageSalary(b) - latestAverageSalary(a)
      )
      .slice(0, DEFAULT_SELECTED_INDUSTRY_COUNT)
      .map((industry) => industry.categoryTag);
  },
  { immediate: true }
);

const handleResize = (): void => {
  chart.value?.resize();
};

// industries now arrives via useIndustryTrends()'s useAsyncData (SSR-fetched
// or resolved after mount) rather than an awaited onMounted fetch, so the
// chart-container ref only exists once the template's v-else branch actually
// renders -- i.e. once loading/error/empty have all cleared. Initialize the
// chart the first time that happens, rather than once unconditionally on
// mount.
const isChartReady = computed(
  (): boolean => !loading.value && !error.value && industries.value.length > 0
);

onMounted(() => {
  window.addEventListener('resize', handleResize);

  watch(
    isChartReady,
    async (ready) => {
      if (!ready) {
        // The v-else chart-container div unmounts (loading/error/empty took
        // over) whenever a reactive refetch (e.g. useIndustryTrends()'s
        // useAsyncData re-running on a country change) flips loading/error
        // back on. Dispose here rather than only in onBeforeUnmount, or the
        // ECharts instance keeps a permanent reference to that now-detached
        // DOM node until the whole component unmounts.
        if (chart.value) {
          chart.value.dispose();
          chart.value = null;
        }
        return;
      }
      if (chart.value) {
        return;
      }
      await nextTick();
      if (chartContainer.value) {
        chart.value = echarts.init(chartContainer.value);
        renderChart();
      }
    },
    { immediate: true }
  );
});

onBeforeUnmount(() => {
  if (chart.value) {
    chart.value.dispose();
  }
  window.removeEventListener('resize', handleResize);
});
</script>
