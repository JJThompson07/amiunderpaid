import { computed } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CardResult from '../Result.vue';

vi.stubGlobal('computed', computed);
vi.stubGlobal('$t', (key: string): string => key);

const mountComponent = (props: Record<string, unknown>): ReturnType<typeof mount> =>
  mount(CardResult, {
    props: { title: 'Live UK Market', userSalary: 65000, marketAverage: 67285, ...props },
    global: {
      mocks: { $t: (key: string): string => key },
      components: {
        AmIChip: {
          template: '<div class="chip"><slot /></div>'
        }
      }
    }
  });

describe('Card/Result', () => {
  it('shows the salary/market-average pair by default', () => {
    const wrapper = mountComponent({});

    expect(wrapper.find('.card-result--salaries').exists()).toBe(true);
    expect(wrapper.find('.card-result--market-only').exists()).toBe(false);
    expect(wrapper.text()).toContain('65,000');
    expect(wrapper.text()).toContain('67,285');
  });

  it('shows only the market average when showUserSalary is false', () => {
    const wrapper = mountComponent({ showUserSalary: false });

    expect(wrapper.find('.card-result--salaries').exists()).toBe(false);
    expect(wrapper.find('.card-result--market-only').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('65,000');
    expect(wrapper.text()).toContain('67,285');
  });

  it('renders the well-paid chip when comparison is 1', () => {
    const wrapper = mountComponent({ comparison: 1 });

    expect(wrapper.find('.chip').text()).toContain('card.result.well-paid');
  });

  it('renders the underpaid chip when comparison is -1', () => {
    const wrapper = mountComponent({ comparison: -1 });

    expect(wrapper.find('.chip').text()).toContain('card.result.underpaid');
  });

  it('renders the fairly-paid chip when comparison is 0', () => {
    const wrapper = mountComponent({ comparison: 0 });

    expect(wrapper.find('.chip').text()).toContain('card.result.fairly-paid');
  });

  it('omits the comparison chip when no user salary is provided', () => {
    const wrapper = mountComponent({ userSalary: 0 });

    expect(wrapper.find('.chip').exists()).toBe(false);
  });
});
