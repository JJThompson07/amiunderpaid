import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';

type MockUserProfile = {
  ukNationalStatus?: 'pending' | 'active';
  usaNationalStatus?: 'pending' | 'active';
};

const mockUserProfile = ref<MockUserProfile>({});
vi.stubGlobal('useUserProfile', () => ({ userProfile: mockUserProfile }));

const mockShowToast = vi.fn();
vi.stubGlobal('useSystemToast', () => ({ showToast: mockShowToast }));

vi.stubGlobal('useI18n', () => ({
  t: (key: string): string => key
}));

const mockGetIdToken = vi.fn();
const mockCurrentUser = ref<{ getIdToken: typeof mockGetIdToken } | null>(null);
vi.mock('vuefire', () => ({ useCurrentUser: (): typeof mockCurrentUser => mockCurrentUser }));

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

const { default: nationalConfirmationComponent } = await import('../NationalConfirmation.vue');

const mountComponent = (): VueWrapper =>
  mount(nationalConfirmationComponent, {
    global: {
      mocks: {
        $t: (key: string, params?: Record<string, unknown>): string =>
          params ? `${key}:${JSON.stringify(params)}` : key
      },
      components: {
        ToastGeneric: {
          props: ['modelValue'],
          template: '<div v-if="modelValue"><slot /></div>'
        },
        AmIButton: {
          props: ['loading'],
          emits: ['click'],
          template: '<button :disabled="loading" @click="$emit(\'click\')"><slot /></button>'
        }
      }
    }
  });

describe('Toast/NationalConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserProfile.value = {};
    mockGetIdToken.mockResolvedValue('id_token_123');
    mockCurrentUser.value = { getIdToken: mockGetIdToken };
    mockFetch.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' }
    });
  });

  it('renders nothing when no national status is pending', () => {
    const wrapper = mountComponent();
    expect(wrapper.findAll('button')).toHaveLength(0);
  });

  it('renders a confirm row for a pending UK grant', () => {
    mockUserProfile.value = { ukNationalStatus: 'pending' };
    const wrapper = mountComponent();
    expect(wrapper.findAll('button')).toHaveLength(1);
  });

  it('renders nothing for an active (already confirmed) grant', () => {
    mockUserProfile.value = { ukNationalStatus: 'active' };
    const wrapper = mountComponent();
    expect(wrapper.findAll('button')).toHaveLength(0);
  });

  it('renders one row per pending country when both are pending', () => {
    mockUserProfile.value = { ukNationalStatus: 'pending', usaNationalStatus: 'pending' };
    const wrapper = mountComponent();
    expect(wrapper.findAll('button')).toHaveLength(2);
  });

  it('confirms via checkout with the currency matching the pending country and redirects to the returned URL', async () => {
    mockUserProfile.value = { usaNationalStatus: 'pending' };
    const wrapper = mountComponent();

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(mockFetch).toHaveBeenCalledWith('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { Authorization: 'Bearer id_token_123' },
      body: { territories: [], currency: 'usd' }
    });
    expect(window.location.href).toBe('https://checkout.stripe.com/test');
  });

  it('shows an error toast and does not navigate when the checkout request fails', async () => {
    mockUserProfile.value = { ukNationalStatus: 'pending' };
    mockFetch.mockRejectedValueOnce(new Error('network error'));
    const wrapper = mountComponent();

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(mockShowToast).toHaveBeenCalledWith(
      'toast.type.error',
      'toast.national-confirmation.action.error',
      'error'
    );
    expect(window.location.href).toBe('');
  });
});
