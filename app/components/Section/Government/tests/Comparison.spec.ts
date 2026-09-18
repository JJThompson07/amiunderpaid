import { computed } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Comparison from '../Comparison.vue';

vi.stubGlobal('computed', computed);

vi.mock('vue-i18n', () => ({
  useI18n: (): { t: (key: string) => string } => ({ t: (key: string): string => key })
}));

const baseProps = {
  isFallback: false,
  location: 'London',
  userSalary: 50000,
  marketAverage: 55000,
  currencySymbol: '£',
  matchedTitle: 'Software Engineer',
  matchedLocation: 'London',
  searchTitle: 'Software Engineer',
  marketDataYear: 2026,
  diffPercent: -9,
  isUnderpaid: true,
  marketLow: 40000,
  marketHigh: 70000
};

const mountComponent = (props: Record<string, unknown> = {}): ReturnType<typeof mount> =>
  mount(Comparison, {
    props: { ...baseProps, ...props },
    global: {
      mocks: {
        $t: (key: string): string => key
      },
      components: {
        CardResult: {
          template: '<div><slot name="info" /><slot name="verdict" /><slot name="footer" /></div>'
        },
        AmIButton: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>'
        },
        LazySectionSalaryVerdict: { template: '<div />' },
        LazySectionGovernmentSalaryVisualizer: { template: '<div />' }
      }
    }
  });

describe('Section/Government/Comparison', () => {
  it('renders the match correction button regardless of match provenance', () => {
    const wrapper = mountComponent();

    expect(wrapper.find('button').exists()).toBe(true);
    expect(wrapper.text()).toContain('buttons.not-best-match');
  });

  it('renders the match correction button even for a freshly resolved fallback match', () => {
    const wrapper = mountComponent({ isFallback: true });

    expect(wrapper.find('button').exists()).toBe(true);
  });

  it('emits userSelect when the button is clicked', async () => {
    const wrapper = mountComponent();

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('userSelect')).toHaveLength(1);
  });
});
