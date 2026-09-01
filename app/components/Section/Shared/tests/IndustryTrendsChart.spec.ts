import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import type { IndustryTrendEntry } from '~~/shared/utils/market-data';

vi.stubGlobal('ref', ref);
vi.stubGlobal('computed', computed);
vi.stubGlobal('watch', watch);
vi.stubGlobal('shallowRef', shallowRef);
vi.stubGlobal('onMounted', onMounted);
vi.stubGlobal('onBeforeUnmount', onBeforeUnmount);
vi.stubGlobal('nextTick', nextTick);

// 7 months, 2025-08 through 2026-02 -- longer than the DEFAULT_RANGE_MONTHS
// (12) is unnecessary here; a span shorter than 12 is exactly what exercises
// the "degrade to full span" branch of the default-range seed.
const industriesFixture: IndustryTrendEntry[] = [
  {
    categoryTag: 'it-jobs',
    label: 'IT Jobs',
    lookupCount: 10,
    history: [
      { month: '2025-08', average: 50000 },
      { month: '2025-09', average: 51000 },
      { month: '2025-10', average: 52000 },
      { month: '2025-11', average: 53000 },
      { month: '2025-12', average: 54000 },
      { month: '2026-01', average: 55000 },
      { month: '2026-02', average: 56000 }
    ]
  },
  {
    categoryTag: 'sales-jobs',
    label: 'Sales Jobs',
    lookupCount: 1,
    // Deliberately a narrower, non-overlapping-at-the-edges window than
    // it-jobs -- fullMonths must still be the UNION across both, not just
    // whichever industry happens to be selected.
    history: [
      { month: '2025-10', average: 40000 },
      { month: '2025-11', average: 41000 },
      { month: '2025-12', average: 42000 }
    ]
  }
];

const mockIndustries = ref<IndustryTrendEntry[]>([]);

vi.stubGlobal('useIndustryTrends', () => ({
  industries: mockIndustries,
  loading: ref(false),
  error: ref(false)
}));
vi.stubGlobal('useRegion', () => ({ currencySymbol: ref('£') }));
vi.stubGlobal('useI18n', () => ({ t: (key: string): string => key, locale: ref('en-GB') }));

vi.mock('echarts', () => ({
  init: vi.fn(() => ({ setOption: vi.fn(), dispose: vi.fn(), resize: vi.fn() }))
}));

const { default: chartComponent } = await import('../IndustryTrendsChart.vue');

// <script setup> internals aren't part of a mounted component's public
// instance type without defineExpose (which this production component
// deliberately doesn't add just for test convenience) -- vue-tsc's
// `pnpm typecheck` doesn't know about them even though they're genuinely
// reachable on wrapper.vm at runtime. This narrows just the bindings these
// tests actually touch, instead of reaching for `any`.
type ChartInternals = {
  fullMonths: string[];
  monthLabels: string[];
  rangeIndices: [number, number];
  allMonths: string[];
  selectedIndustries: string[];
};

const internals = (wrapper: VueWrapper): ChartInternals => wrapper.vm as unknown as ChartInternals;

const mountChart = async (): Promise<VueWrapper> => {
  const wrapper = mount(chartComponent, {
    global: { mocks: { $t: (key: string): string => key } }
  });
  await nextTick();
  return wrapper;
};

describe('Section/Shared/IndustryTrendsChart', () => {
  beforeEach(() => {
    mockIndustries.value = industriesFixture;
  });

  it('derives fullMonths as the union across ALL industries, not just currently-selected ones', async () => {
    const wrapper = await mountChart();

    expect(internals(wrapper).fullMonths).toEqual([
      '2025-08',
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02'
    ]);
  });

  it('formats monthLabels as human-readable "Mon YYYY" strings parallel to fullMonths', async () => {
    const wrapper = await mountChart();
    const vm = internals(wrapper);

    expect(vm.monthLabels[0]).toBe('Aug 2025');
    expect(vm.monthLabels.at(-1)).toBe('Feb 2026');
    expect(vm.monthLabels).toHaveLength(vm.fullMonths.length);
  });

  it('seeds the default range to the full span when fewer than 12 months of data exist', async () => {
    const wrapper = await mountChart();
    const vm = internals(wrapper);

    // Only 7 months exist -- degrades to [0, length-1], i.e. the full span,
    // rather than clipping to a 12-month window that doesn't exist yet.
    expect(vm.rangeIndices).toEqual([0, 6]);
    expect(vm.allMonths).toEqual(vm.fullMonths);
  });

  it('slices allMonths to the selected rangeIndices window', async () => {
    const wrapper = await mountChart();
    const vm = internals(wrapper);

    vm.rangeIndices = [2, 4];
    await nextTick();

    expect(vm.allMonths).toEqual(['2025-10', '2025-11', '2025-12']);
  });

  it('keeps fullMonths (and therefore the slider bounds) stable when an industry is deselected', async () => {
    const wrapper = await mountChart();
    const vm = internals(wrapper);
    const boundsBefore = vm.fullMonths;

    // sales-jobs only has 2025-10..2025-12 in its own history -- if bounds
    // were still scoped to visibleIndustries (the pre-fix behavior), losing
    // it-jobs would shrink fullMonths down to that narrower window.
    vm.selectedIndustries = ['sales-jobs'];
    await nextTick();

    expect(internals(wrapper).fullMonths).toEqual(boundsBefore);
  });
});
