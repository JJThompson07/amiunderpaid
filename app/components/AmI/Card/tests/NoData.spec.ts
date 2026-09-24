import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AmICardNoData from '../NoData.vue';

const mountComponent = (props: Record<string, unknown> = {}): ReturnType<typeof mount> =>
  mount(AmICardNoData, {
    props: {
      title: 'Software Engineer',
      country: 'UK',
      ...props
    },
    global: {
      mocks: {
        $t: (key: string): string => key
      },
      stubs: {
        'i18n-t': {
          props: ['keypath'],
          template: '<p><slot name="role" /><slot name="location" /></p>'
        }
      }
    }
  });

describe('AmI/Card/NoData', () => {
  it('falls back to the default salary-focused heading and body when no overrides are given', () => {
    const wrapper = mountComponent();

    expect(wrapper.text()).toContain('card.no-data.heading');
    expect(wrapper.find('i18n-t-stub, p').exists()).toBe(true);
  });

  it('renders a custom heading and body when overrides are provided', () => {
    const wrapper = mountComponent({
      heading: 'No matching roles found',
      body: "We couldn't find any role matches for your search criteria. Please try to broaden your search or try another role."
    });

    expect(wrapper.text()).toContain('No matching roles found');
    expect(wrapper.text()).toContain("We couldn't find any role matches for your search criteria.");
    expect(wrapper.text()).not.toContain('card.no-data.heading');
  });

  it('shows the "try a different search" button by default', () => {
    const wrapper = mountComponent();

    expect(wrapper.text()).toContain('card.no-data.try-different');
  });

  it('omits the "try a different search" button when showButton is false', () => {
    const wrapper = mountComponent({ showButton: false });

    expect(wrapper.text()).not.toContain('card.no-data.try-different');
  });
});
