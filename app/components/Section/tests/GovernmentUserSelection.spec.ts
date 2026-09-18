import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import GovernmentUserSelection from '../GovernmentUserSelection.vue';

vi.mock('vue-i18n', () => ({
  useI18n: (): { t: (key: string) => string } => ({ t: (key: string): string => key })
}));

vi.stubGlobal('useDebounceFn', (fn: (...args: unknown[]) => unknown) => {
  return (...args: unknown[]): unknown => fn(...args);
});

const mockSearch = vi.fn();
const mockInitIndex = vi.fn(() => ({ search: mockSearch }));

vi.stubGlobal('useNuxtApp', () => ({
  $algolia: { initIndex: mockInitIndex }
}));

const autocompleteStub = {
  props: ['modelValue', 'options', 'loading', 'label', 'placeholder', 'icon', 'preFilteredOptions'],
  emits: ['update:modelValue'],
  template:
    '<div><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /><ul><li v-for="opt in options" :key="opt.value">{{ opt.label }}</li></ul></div>'
};

const mountComponent = (props: Record<string, unknown> = {}): ReturnType<typeof mount> =>
  mount(GovernmentUserSelection, {
    props: { country: 'UK', ...props },
    global: {
      mocks: { $t: (key: string): string => key },
      components: {
        AmIInputAutocomplete: autocompleteStub,
        'i18n-t': { template: '<span><slot name="category" /></span>' }
      }
    }
  });

describe('Section/GovernmentUserSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches Algolia for the active country and populates options from the results', async () => {
    mockSearch.mockResolvedValueOnce({
      hits: [{ objectID: '1', title: 'Software Engineer', group: 'Technology (SOC 123)' }]
    });

    const wrapper = mountComponent();
    await wrapper.find('input').setValue('engineer');
    await Promise.resolve();
    await Promise.resolve();

    expect(mockInitIndex).toHaveBeenCalledWith('salary_benchmarks');
    expect(mockSearch).toHaveBeenCalledWith('engineer', { filters: 'country:UK', hitsPerPage: 50 });
    expect(wrapper.text()).toContain('Software Engineer (Technology)');
  });

  it('does not search when the query is under two characters', async () => {
    const wrapper = mountComponent();
    await wrapper.find('input').setValue('e');

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('emits select with the matching hit when the option label is chosen', async () => {
    mockSearch.mockResolvedValueOnce({
      hits: [{ objectID: '1', title: 'Software Engineer', group: 'Technology (SOC 123)' }]
    });

    const wrapper = mountComponent();
    await wrapper.find('input').setValue('engineer');
    await Promise.resolve();
    await Promise.resolve();

    await wrapper.find('input').setValue('Software Engineer (Technology)');

    expect(wrapper.emitted('select')).toHaveLength(1);
    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ objectID: '1' });
  });

  it('hides the cancel button by default and shows it when canCancel is true', () => {
    const withoutCancel = mountComponent();
    expect(withoutCancel.find('button').exists()).toBe(false);

    const withCancel = mountComponent({ canCancel: true });
    expect(withCancel.find('button').exists()).toBe(true);
  });

  it('emits cancel when the cancel button is clicked', async () => {
    const wrapper = mountComponent({ canCancel: true });

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
