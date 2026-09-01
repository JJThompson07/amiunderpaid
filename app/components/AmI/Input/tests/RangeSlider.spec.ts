import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import RangeSlider from '../RangeSlider.vue';

const LABELS = ['2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01'];

describe('AmI/Input/RangeSlider', () => {
  it('renders the from/to labels for the current modelValue indices', () => {
    const wrapper = mount(RangeSlider, {
      props: { modelValue: [1, 4], labels: LABELS }
    });

    const spans = wrapper.findAll('span');
    expect(spans[0]?.text()).toBe('2025-09');
    expect(spans[1]?.text()).toBe('2025-12');
  });

  it('emits an updated from index when the from input moves within bounds', async () => {
    const wrapper = mount(RangeSlider, {
      props: { modelValue: [1, 4], labels: LABELS }
    });

    const [fromInput] = wrapper.findAll('input[type="range"]');
    await fromInput?.setValue('2');

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[2, 4]]);
  });

  it('clamps the from index to the to index instead of letting the handles cross', async () => {
    const wrapper = mount(RangeSlider, {
      props: { modelValue: [1, 4], labels: LABELS }
    });

    const [fromInput] = wrapper.findAll('input[type="range"]');
    await fromInput?.setValue('5');

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[4, 4]]);
  });

  it('emits an updated to index when the to input moves within bounds', async () => {
    const wrapper = mount(RangeSlider, {
      props: { modelValue: [1, 4], labels: LABELS }
    });

    const [, toInput] = wrapper.findAll('input[type="range"]');
    await toInput?.setValue('3');

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[1, 3]]);
  });

  it('clamps the to index to the from index instead of letting the handles cross', async () => {
    const wrapper = mount(RangeSlider, {
      props: { modelValue: [1, 4], labels: LABELS }
    });

    const [, toInput] = wrapper.findAll('input[type="range"]');
    await toInput?.setValue('0');

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[1, 1]]);
  });

  it('caps max at 0 (not -1) when given an empty labels array, so the native inputs stay valid', () => {
    const wrapper = mount(RangeSlider, {
      props: { modelValue: [0, 0], labels: [] }
    });

    const inputs = wrapper.findAll('input[type="range"]');
    expect(inputs[0]?.attributes('max')).toBe('0');
    expect(inputs[1]?.attributes('max')).toBe('0');
  });

  it('sets aria-valuetext to the current label so screen readers announce the month, not the raw index', () => {
    const wrapper = mount(RangeSlider, {
      props: { modelValue: [1, 4], labels: LABELS }
    });

    const [fromInput, toInput] = wrapper.findAll('input[type="range"]');
    expect(fromInput?.attributes('aria-valuetext')).toBe('2025-09');
    expect(toInput?.attributes('aria-valuetext')).toBe('2025-12');
  });

  it('passes fromAriaLabel/toAriaLabel through to the respective inputs', () => {
    const wrapper = mount(RangeSlider, {
      props: {
        modelValue: [0, 1],
        labels: LABELS,
        fromAriaLabel: 'From month',
        toAriaLabel: 'To month'
      }
    });

    const [fromInput, toInput] = wrapper.findAll('input[type="range"]');
    expect(fromInput?.attributes('aria-label')).toBe('From month');
    expect(toInput?.attributes('aria-label')).toBe('To month');
  });

  it('positions the filled-track segment as a percentage of the full step range', () => {
    const wrapper = mount(RangeSlider, {
      props: { modelValue: [1, 4], labels: LABELS }
    });

    // labels has 6 entries -> maxIndex 5; from=1 -> 20%, to=4 -> 80%.
    const fill = wrapper.find('.bg-primary-500');
    expect(fill.attributes('style')).toContain('left: 20%');
    expect(fill.attributes('style')).toContain('width: 60%');
  });
});
