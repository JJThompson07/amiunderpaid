import { computed, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SalaryVisualizer from '../SalaryVisualizer.vue';

vi.stubGlobal('computed', computed);
vi.stubGlobal('ref', ref);

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
  it('positions the Low and High labels below the range bar, and the User Salary label above it', () => {
    const wrapper = mountComponent();
    const labels = wrapper.findAll('.text-2xs.uppercase.font-bold.text-slate-500');

    expect(labels).toHaveLength(2);
    labels.forEach((label) => {
      expect(label.classes()).toContain('-bottom-6');
      expect(label.classes()).not.toContain('-top-6');
    });

    const userSalaryLabel = wrapper.find('.border-2.border-white .absolute.-top-6');
    expect(userSalaryLabel.exists()).toBe(true);
  });

  it('gives the Market Average marker an accessible group role, tabindex, and label', () => {
    const wrapper = mountComponent();
    const marker = wrapper.find('.bg-primary-600');

    expect(marker.attributes('role')).toBe('group');
    expect(marker.attributes('tabindex')).toBe('0');
    expect(marker.attributes('aria-label')).toContain('sections.visualiser.average');
  });

  it('keeps the Market Average tooltip hidden until hovered, focused, or tapped', () => {
    const wrapper = mountComponent();
    const tooltip = wrapper.find('[role="tooltip"]');

    expect(tooltip.exists()).toBe(true);
    expect(tooltip.classes()).toContain('opacity-0');
    expect(tooltip.classes()).not.toContain('opacity-100');
    expect(tooltip.text()).toContain('55,000');
  });

  it('reveals the Market Average tooltip on tap and hides it again on blur', async () => {
    const wrapper = mountComponent();
    const marker = wrapper.find('.bg-primary-600');

    await marker.trigger('click');
    expect(wrapper.find('[role="tooltip"]').classes()).toContain('opacity-100');

    await marker.trigger('blur');
    expect(wrapper.find('[role="tooltip"]').classes()).not.toContain('opacity-100');
  });

  it('reveals the Market Average tooltip on keyboard focus and on Enter/Space', async () => {
    const wrapper = mountComponent();
    const marker = wrapper.find('.bg-primary-600');

    await marker.trigger('focus');
    expect(wrapper.find('[role="tooltip"]').classes()).toContain('opacity-100');

    await marker.trigger('blur');
    expect(wrapper.find('[role="tooltip"]').classes()).not.toContain('opacity-100');

    await marker.trigger('keydown', { key: 'Enter' });
    expect(wrapper.find('[role="tooltip"]').classes()).toContain('opacity-100');
  });

  it('dismisses the Market Average tooltip on Escape without requiring blur', async () => {
    const wrapper = mountComponent();
    const marker = wrapper.find('.bg-primary-600');

    await marker.trigger('focus');
    expect(wrapper.find('[role="tooltip"]').classes()).toContain('opacity-100');

    await marker.trigger('keydown', { key: 'Escape' });
    expect(wrapper.find('[role="tooltip"]').classes()).not.toContain('opacity-100');
  });

  it('uses the primary brand colour for the tooltip background and raises it above the user marker while open', async () => {
    const wrapper = mountComponent();
    const marker = wrapper.find('.bg-primary-600');
    const tooltip = wrapper.find('[role="tooltip"]');

    expect(tooltip.classes()).toContain('bg-primary-700');
    expect(marker.classes()).toContain('z-10');
    expect(marker.classes()).not.toContain('z-30');

    await marker.trigger('click');
    expect(marker.classes()).toContain('z-30');
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
