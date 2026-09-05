import { computed } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AmICardRole from '../Role.vue';

vi.stubGlobal('computed', computed);
vi.stubGlobal('useAnalytics', () => ({ trackViewRole: vi.fn() }));
vi.stubGlobal('useNuxtApp', () => ({
  $siteBrand: 'amiunderpaid',
  $i18n: { t: (key: string): string => key }
}));
vi.stubGlobal('$t', (key: string): string => key);

const mountComponent = (props: Record<string, unknown>): ReturnType<typeof mount> =>
  mount(AmICardRole, {
    props: {
      title: 'Senior Engineer',
      company: 'Acme Corp',
      contract: 'permanent',
      schedule: 'full_time',
      location: 'London',
      salaryMin: 55000,
      salaryMax: 65000,
      currencySymbol: '£',
      ...props
    },
    global: {
      mocks: { $t: (key: string): string => key },
      components: {
        AmIChip: {
          props: ['bgColour', 'textColour', 'icon', 'textSize', 'compact'],
          template: '<div class="chip"><slot /></div>'
        },
        AmIButton: {
          template: '<button><slot /></button>'
        }
      }
    }
  });

describe('AmI/Card/Role', () => {
  it('shows a positive comparison chip when the role pays more than the user currently earns', () => {
    const wrapper = mountComponent({ userSalary: 50000, salaryMax: 60000 });

    expect(wrapper.find('header .chip').exists()).toBe(true);
    expect(wrapper.text()).toContain('20%');
    expect(wrapper.text()).toContain('card.role.amiunderpaid.compare.pay-rise');
  });

  it('shows a negative comparison chip when the role pays less than the user currently earns', () => {
    const wrapper = mountComponent({ userSalary: 50000, salaryMax: 40000 });

    expect(wrapper.find('header .chip').exists()).toBe(true);
    expect(wrapper.text()).toContain('-20%');
    expect(wrapper.text()).toContain('card.role.amiunderpaid.compare.pay-cut');
  });

  it('shows a no-change comparison chip when the role pays the same as the user currently earns', () => {
    const wrapper = mountComponent({ userSalary: 50000, salaryMax: 50000 });

    expect(wrapper.find('header .chip').exists()).toBe(true);
    expect(wrapper.text()).toContain('0%');
    expect(wrapper.text()).toContain('card.role.amiunderpaid.compare.no-change');
  });

  it('omits the comparison chip when no user salary is provided', () => {
    const wrapper = mountComponent({ userSalary: 0 });

    expect(wrapper.find('header .chip').exists()).toBe(false);
  });

  it('renders a company-initial avatar derived from the company prop', () => {
    const wrapper = mountComponent({ company: 'zephyr labs' });

    expect(wrapper.text()).toContain('Z');
  });

  it('renders the formatted salary range', () => {
    const wrapper = mountComponent({ salaryMin: 55000, salaryMax: 65000 });

    expect(wrapper.text()).toContain('55,000');
    expect(wrapper.text()).toContain('65,000');
  });
});
