import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';

import affiliateOfferComponent from '../AffiliateOffer.vue';
import type { AffiliatePartnerSlug } from '~~/shared/utils/affiliates';

const copyKeys = {
  title: 'toast.affiliate.purple-cv.fair.title',
  message: 'toast.affiliate.purple-cv.fair.message',
  cta: 'toast.affiliate.purple-cv.cta'
};

const mountComponent = (
  props: Partial<{ modelValue: boolean; partner: AffiliatePartnerSlug }> = {}
): VueWrapper =>
  mount(affiliateOfferComponent, {
    props: {
      modelValue: true,
      partner: 'purple-cv',
      url: 'https://purplecv.co.uk/cv-writing?wpam_id=1293',
      copyKeys,
      ...props
    },
    global: {
      mocks: { $t: (key: string): string => key },
      components: {
        ToastGeneric: {
          props: ['modelValue', 'zIndexClass', 'bgClasses', 'duration'],
          template:
            '<div v-if="modelValue" class="toast" :data-z="zIndexClass" :data-bg="bgClasses" :data-duration="duration"><slot /></div>'
        }
      }
    }
  });

describe('Toast/AffiliateOffer', () => {
  it('stays hidden until opened', () => {
    expect(mountComponent({ modelValue: false }).find('.toast').exists()).toBe(false);
  });

  it('renders the verdict copy, sponsored label and an accessible live region', () => {
    const wrapper = mountComponent();
    const region = wrapper.find('[role="status"]');

    expect(region.attributes('aria-live')).toBe('polite');
    expect(wrapper.text()).toContain('toast.affiliate.sponsored');
    expect(wrapper.find('h3').text()).toBe(copyKeys.title);
    expect(wrapper.find('p').text()).toBe(copyKeys.message);
    expect(wrapper.find('.sr-only').text()).toBe('common.close');
  });

  it('sits below system toasts and never auto-closes', () => {
    const toast = mountComponent().find('.toast');
    expect(toast.attributes('data-z')).toBe('z-[90]');
    expect(toast.attributes('data-duration')).toBe('0');
  });

  it('links to the partner in a new tab as a sponsored link', () => {
    const link = mountComponent().find('a');
    expect(link.attributes('href')).toBe('https://purplecv.co.uk/cv-writing?wpam_id=1293');
    expect(link.attributes('target')).toBe('_blank');
    expect(link.attributes('rel')).toBe('sponsored');
    expect(link.text()).toBe(copyKeys.cta);
  });

  it('emits cta on click and middle-click', async () => {
    const wrapper = mountComponent();
    const link = wrapper.find('a');
    link.element.addEventListener('click', (event) => event.preventDefault());

    await link.trigger('click');
    await link.trigger('auxclick', { button: 1 });
    await link.trigger('auxclick', { button: 2 });

    expect(wrapper.emitted('cta')).toHaveLength(2);
  });

  it('emits dismiss from the close button', async () => {
    const wrapper = mountComponent();
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('dismiss')).toHaveLength(1);
  });

  it.each(['salary-negotiator', 'purple-cv', 'cv-library'] as const)(
    'themes the toast for %s',
    (partner) => {
      expect(mountComponent({ partner }).find('.toast').attributes('data-bg')).toContain(
        `border-${partner}-200`
      );
    }
  );
});
