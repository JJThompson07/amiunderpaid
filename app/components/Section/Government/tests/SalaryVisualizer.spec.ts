import { computed } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SalaryVisualizer from '../SalaryVisualizer.vue';

vi.stubGlobal('computed', computed);

vi.mock('vue-i18n', () => ({
  useI18n: (): { t: (key: string) => string } => ({ t: (key: string): string => key })
}));

const baseProps = {
  userSalary: 55000,
  marketAverage: 55000,
  marketLow: 40000,
  marketHigh: 70000,
  currencySymbol: '£',
  diffPercent: 0,
  isUnderpaid: false
};

const mountComponent = (props: Record<string, unknown> = {}): ReturnType<typeof mount> =>
  mount(SalaryVisualizer, {
    props: { ...baseProps, ...props },
    global: {
      mocks: {
        $t: (key: string): string => key
      }
    }
  });

describe('Section/Government/SalaryVisualizer', () => {
  it('positions the Low and High labels below the range bar, and the Average label above it', () => {
    const wrapper = mountComponent();
    const labels = wrapper.findAll('.text-2xs.uppercase.font-bold.text-slate-500');

    expect(labels).toHaveLength(2);
    labels.forEach((label) => {
      expect(label.classes()).toContain('-bottom-6');
      expect(label.classes()).not.toContain('-top-6');
    });

    const averageLabel = wrapper.find('.text-primary-600');
    expect(averageLabel.classes()).toContain('-top-6');
  });

  it('places the Market Average marker at the midpoint of the low-high range', () => {
    const wrapper = mountComponent({ marketAverage: 55000, marketLow: 40000, marketHigh: 70000 });
    const marker = wrapper.find('.bg-primary-600');

    expect(marker.attributes('style')).toContain('left: 50%');
  });

  it('places the Market Average marker at the low boundary when it equals marketLow', () => {
    const wrapper = mountComponent({ marketAverage: 40000, marketLow: 40000, marketHigh: 70000 });
    const marker = wrapper.find('.bg-primary-600');

    expect(marker.attributes('style')).toContain('left: 0%');
  });

  it('clamps the average position to 50% when marketHigh does not exceed marketLow', () => {
    const wrapper = mountComponent({ marketAverage: 40000, marketLow: 40000, marketHigh: 40000 });
    const marker = wrapper.find('.bg-primary-600');

    expect(marker.attributes('style')).toContain('left: 50%');
  });

  it('positions the user salary marker proportionally within the range', () => {
    const wrapper = mountComponent({ userSalary: 55000, marketLow: 40000, marketHigh: 70000 });
    const marker = wrapper.find('.border-2.border-white');

    expect(marker.attributes('style')).toContain('left: 50%');
  });

  it('omits the user salary marker when there is no salary to compare', () => {
    const wrapper = mountComponent({ userSalary: 0 });

    expect(wrapper.find('.border-2.border-white').exists()).toBe(false);
  });
});
