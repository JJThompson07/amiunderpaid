import { computed } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { RecruiterCard } from '~~/shared/utils/types';
import AmIRecruiterButton from '../RecruiterButton.vue';

vi.stubGlobal('computed', computed);

const baseCard: RecruiterCard = {
  recruiterId: 'rec-1',
  isExclusive: false,
  title: 'Hiring for {incentive} in {location}',
  content: null,
  categoryContent: null,
  brandBgColour: '#123456',
  brandTextColour: '#ffffff',
  buttonText: 'Contact {agency}',
  logoUrl: null,
  agencyName: 'Acme Recruiting'
};

const mountComponent = (
  card: Partial<RecruiterCard> = {},
  props: Record<string, unknown> = {},
  path = '/salary/developer/uk'
): ReturnType<typeof mount> => {
  vi.stubGlobal('useRoute', () => ({ path }));

  return mount(AmIRecruiterButton, {
    props: { card: { ...baseCard, ...card }, location: 'London', ...props }
  });
};

describe('AmI/RecruiterButton', () => {
  it('replaces {location}, {agency}, and {incentive} wildcards in the title and button text', () => {
    const wrapper = mountComponent();

    expect(wrapper.text()).toContain('Hiring for roles in London');
    expect(wrapper.text()).toContain('Contact Acme Recruiting');
  });

  it('uses "candidates" as the incentive on benchmark pages', () => {
    const wrapper = mountComponent({}, {}, '/benchmark/developer/uk');

    expect(wrapper.text()).toContain('Hiring for candidates in London');
  });

  it('falls back to default copy when title and buttonText are not configured', () => {
    const wrapper = mountComponent({ title: null, buttonText: null });

    expect(wrapper.text()).toContain('Get in touch');
    expect(wrapper.text()).toContain('Contact Us');
  });

  it('falls back to the agency name and briefcase icon when no logo is configured', () => {
    const wrapper = mountComponent({ agencyName: null, logoUrl: null });

    expect(wrapper.text()).toContain('Hiring Expert');
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('renders the recruiter-configured logo image when present', () => {
    const wrapper = mountComponent({ logoUrl: 'https://example.com/logo.png' });

    expect(wrapper.find('img').attributes('src')).toBe('https://example.com/logo.png');
  });

  it('applies the recruiter-configured brand colours to the CTA button', () => {
    const wrapper = mountComponent({ brandBgColour: '#ff0000', brandTextColour: '#00ff00' });
    const button = wrapper.find('button');

    expect(button.attributes('style')).toContain('background-color: #ff0000');
    expect(button.attributes('style')).toContain('color: #00ff00');
  });

  it('emits click with the card when the CTA button is pressed', async () => {
    const wrapper = mountComponent();

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('click')?.[0]).toEqual([baseCard]);
  });
});
