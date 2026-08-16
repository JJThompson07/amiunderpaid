import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref, nextTick } from 'vue';
import { useElementSize } from '@vueuse/core';

import { useCarousel } from '../useCarousel';

vi.mock('@vueuse/core', () => {
  return {
    useElementSize: vi.fn(),
    useEventListener: vi.fn()
  };
});

const widthRef = ref(1000);

describe('useCarousel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    widthRef.value = 1000;
    vi.mocked(useElementSize).mockReturnValue({ width: widthRef } as any);
  });

  it('computes card width and maxItemsToShow correctly for different widths', async () => {
    widthRef.value = 1000;
    const { cardWidth, trackRef } = useCarousel();
    expect(cardWidth.value).toBe('calc((100% - 16px) / 2)');

    widthRef.value = 500; // < 640
    await nextTick();
    expect(cardWidth.value).toBe('calc((100% - 0px) / 1)');

    widthRef.value = 1200; // >= 1024
    await nextTick();
    expect(cardWidth.value).toBe('calc((100% - 32px) / 3)');

    widthRef.value = 0; // falsy width
    await nextTick();
    expect(cardWidth.value).toBe('100%');
  });

  it('computes actualItemsToShow correctly when itemCount > 0', async () => {
    widthRef.value = 1200; // max is 3
    const { cardWidth, trackRef } = useCarousel();
    
    // Mount to trigger updateItemCount which sets itemCount
    const TestComponent = defineComponent({
      template: '<div ref="trackRef"><div>c1</div><div>c2</div></div>',
      setup() {
        const { trackRef, cardWidth } = useCarousel();
        return { trackRef, cardWidth };
      }
    });
    
    const wrapper = mount(TestComponent);
    await nextTick();
    
    // itemCount should be 2 now, min(3, 2) = 2
    expect(wrapper.vm.cardWidth).toBe('calc((100% - 16px) / 2)');
  });

  it('handles empty trackRef gracefully in checkScroll and scrollByAmount', () => {
    const { checkScroll, scrollByAmount } = useCarousel();
    expect(() => checkScroll()).not.toThrow();
    expect(() => scrollByAmount(1)).not.toThrow();
  });

  it('handles empty children in scrollByAmount', () => {
    const { scrollByAmount, trackRef } = useCarousel();
    trackRef.value = document.createElement('div');
    expect(() => scrollByAmount(1)).not.toThrow();
  });

  it('scrolls by amount correctly', () => {
    const { scrollByAmount, trackRef } = useCarousel();
    const mockTrack = document.createElement('div');
    const child1 = document.createElement('div');
    Object.defineProperty(child1, 'offsetWidth', { value: 200, configurable: true });
    mockTrack.appendChild(child1);
    
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = vi.fn().mockReturnValue({ gap: '16px' } as any);
    mockTrack.scrollBy = vi.fn();
    trackRef.value = mockTrack;
    
    scrollByAmount(1);
    expect(mockTrack.scrollBy).toHaveBeenCalledWith({ left: 216, behavior: 'smooth' });
    
    scrollByAmount(-1);
    expect(mockTrack.scrollBy).toHaveBeenCalledWith({ left: -216, behavior: 'smooth' });
    window.getComputedStyle = originalGetComputedStyle;
  });

  it('checks scroll correctly', () => {
    const { checkScroll, trackRef, isScrollable, canScrollLeft, canScrollRight } = useCarousel();
    const mockTrack = document.createElement('div');
    Object.defineProperty(mockTrack, 'scrollLeft', { value: 5, configurable: true });
    Object.defineProperty(mockTrack, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(mockTrack, 'clientWidth', { value: 500, configurable: true });
    
    trackRef.value = mockTrack;
    checkScroll();
    
    expect(isScrollable.value).toBe(true);
    expect(canScrollLeft.value).toBe(true);
    expect(canScrollRight.value).toBe(true);
  });

  it('triggers lifecycle hooks and updates itemCount', async () => {
    vi.useFakeTimers();
    const TestComponent = defineComponent({
      props: ['testProp'],
      template: '<div ref="trackRef"><div>c1</div><div>c2</div></div>',
      setup() {
        const { trackRef } = useCarousel();
        return { trackRef };
      }
    });
    
    const wrapper = mount(TestComponent);
    vi.runAllTimers();
    
    // Trigger onUpdated
    await wrapper.setProps({ testProp: 'updated' });
    vi.runAllTimers();
    
    vi.useRealTimers();
  });
});
