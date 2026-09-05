import { computed } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import KpiSummary from '../KpiSummary.vue';

vi.stubGlobal('computed', computed);
vi.stubGlobal('$t', (key: string): string => key);

const mountComponent = (props: Record<string, unknown>): ReturnType<typeof mount> =>
  mount(KpiSummary, {
    props: {
      userSalary: 65000,
      currencySymbol: '£',
      hasJobsData: true,
      liveMarketAverage: 70000,
      hasGovernmentData: true,
      govMarketAverage: 67285,
      marketHigh: 82000,
      diffPercentGov: -3.4,
      ...props
    },
    global: {
      mocks: {
        $t: (key: string, params?: Record<string, unknown>): string =>
          `${key}${params ? JSON.stringify(params) : ''}`
      }
    }
  });

describe('Section/Results/KpiSummary', () => {
  it('renders all four cards when full data is available', () => {
    const wrapper = mountComponent({});
    const cards = wrapper.findAll('.kpi-summary > div');

    expect(cards).toHaveLength(4);
    expect(wrapper.text()).toContain('65,000');
    expect(wrapper.text()).toContain('70,000');
    expect(wrapper.text()).toContain('67,285');
    expect(wrapper.text()).toContain('82,000');
  });

  it('omits the live market card when there is no live jobs data', () => {
    const wrapper = mountComponent({ hasJobsData: false });
    const cards = wrapper.findAll('.kpi-summary > div');

    expect(cards).toHaveLength(3);
    expect(wrapper.text()).not.toContain('70,000');
  });

  it('omits the government benchmark and ceiling cards when there is no government data', () => {
    const wrapper = mountComponent({ hasGovernmentData: false });
    const cards = wrapper.findAll('.kpi-summary > div');

    expect(cards).toHaveLength(2);
    expect(wrapper.text()).not.toContain('67,285');
    expect(wrapper.text()).not.toContain('82,000');
  });

  it('omits the salary card and all variance figures when no user salary is entered', () => {
    const wrapper = mountComponent({ userSalary: 0 });
    const cards = wrapper.findAll('.kpi-summary > div');

    expect(cards).toHaveLength(3);
    expect(wrapper.text()).not.toContain('65,000');
    expect(wrapper.find('.text-negative-600').exists()).toBe(false);
    expect(wrapper.find('.text-positive-600').exists()).toBe(false);
  });

  it('colours a negative variance red', () => {
    const wrapper = mountComponent({ diffPercentGov: -10 });

    expect(wrapper.find('.text-negative-600').exists()).toBe(true);
  });

  it('does not double up the negative sign in the government variance percentage', () => {
    const wrapper = mountComponent({ diffPercentGov: -3.4 });

    expect(wrapper.text()).toContain('(3.4%)');
    expect(wrapper.text()).not.toContain('(-3.4%)');
  });

  it('does not double up the negative sign in the live-market variance percentage', () => {
    // userSalary (65000) below liveMarketAverage (70000) yields a negative diff percent.
    const wrapper = mountComponent({ userSalary: 65000, liveMarketAverage: 70000 });

    expect(wrapper.text()).toMatch(/\(\d+(\.\d+)?%\)/);
    expect(wrapper.text()).not.toMatch(/\(-\d/);
  });
});
