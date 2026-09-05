import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { McaUiData } from '~~/shared/utils/formatter';
import Mca from '../Mca.vue';

vi.mock('vue-i18n', () => ({
  useI18n: (): { t: (key: string, params?: Record<string, unknown>) => string } => ({
    t: (key: string, params?: Record<string, unknown>): string =>
      `${key}${params ? JSON.stringify(params) : ''}`
  })
}));

const baseVerdict: McaUiData = {
  score: 72,
  label: 'Strong Alignment',
  confidenceScore: 8,
  percentileRank: 65,
  comparisonPoints: [],
  microPercentile: 65,
  macroPercentile: 55,
  livePercentile: 60,
  modifier: 1
};

const mountComponent = (verdict: McaUiData): ReturnType<typeof mount> =>
  mount(Mca, {
    props: { verdict },
    global: {
      mocks: {
        $t: (key: string, params?: Record<string, unknown>): string =>
          `${key}${params ? JSON.stringify(params) : ''}`
      },
      components: {
        AmIChartRange: {
          props: ['percentile', 'label', 'description', 'mca'],
          template: '<div class="chart-range">{{ label }}</div>'
        }
      }
    }
  });

describe('Section/Score/Mca', () => {
  it('renders the modifier row with a directional description when the modifier is above 1', () => {
    const wrapper = mountComponent({ ...baseVerdict, modifier: 1.25 });

    expect(wrapper.text()).toContain('1.25x');
    expect(wrapper.text()).toContain('mca.breakdowns.modifier.above');
  });

  it('renders the modifier row with a directional description when the modifier is below 1', () => {
    const wrapper = mountComponent({ ...baseVerdict, modifier: 0.85 });

    expect(wrapper.text()).toContain('0.85x');
    expect(wrapper.text()).toContain('mca.breakdowns.modifier.below');
  });

  it('omits the modifier row when the modifier is exactly 1', () => {
    const wrapper = mountComponent({ ...baseVerdict, modifier: 1 });

    expect(wrapper.text()).not.toContain('1.00x');
  });

  it('omits the modifier row when the modifier is float-imprecisely off 1 by less than a percent', () => {
    // Not exactly 1, but rounds to a 0% modifier -- a raw `!== 1` check would
    // let this through and render an awkward "0% above the national baseline".
    const wrapper = mountComponent({ ...baseVerdict, modifier: 1.0000000000000002 });

    expect(wrapper.text()).not.toContain('mca.breakdowns.modifier.above');
    expect(wrapper.text()).not.toContain('mca.breakdowns.modifier.below');
  });

  it('renders the score, label, and confidence bar unaffected by the modifier row', () => {
    const wrapper = mountComponent({ ...baseVerdict, modifier: 1.1 });

    expect(wrapper.text()).toContain('Strong Alignment');
    expect(wrapper.text()).toContain('8/10');
  });

  it('toggles the breakdown section open and closed', async () => {
    const wrapper = mountComponent(baseVerdict);

    expect(wrapper.text()).toContain('mca.toggle.show');

    await wrapper.find('button').trigger('click');

    expect(wrapper.text()).toContain('mca.toggle.hide');
  });

  it('renders live, micro, and macro breakdown rows via AmIChartRange', () => {
    const wrapper = mountComponent(baseVerdict);
    const ranges = wrapper.findAll('.chart-range');

    expect(ranges).toHaveLength(3);
  });
});
