import type { ComputedRef, Ref } from 'vue';
import { computed, onMounted, onUpdated, ref } from 'vue';
import { useElementSize, useEventListener } from '@vueuse/core';

type UseCarouselReturn = {
  trackRef: Ref<HTMLElement | null>;
  canScrollLeft: Ref<boolean>;
  canScrollRight: Ref<boolean>;
  isScrollable: Ref<boolean>;
  cardWidth: ComputedRef<string>;
  checkScroll: () => void;
  scrollByAmount: (direction: 1 | -1) => void;
};

export const useCarousel = (): UseCarouselReturn => {
  const trackRef = ref<HTMLElement | null>(null);
  const canScrollLeft = ref(false);
  const canScrollRight = ref(true);
  const isScrollable = ref(false);
  const itemCount = ref(0);

  const { width } = useElementSize(trackRef);

  const maxItemsToShow = computed(() => {
    if (width.value < 640) {
      return 1;
    }
    if (width.value < 1024) {
      return 2;
    }
    return 3;
  });

  const actualItemsToShow = computed(() => {
    if (itemCount.value === 0) {
      return maxItemsToShow.value;
    }
    return Math.min(maxItemsToShow.value, itemCount.value);
  });

  const cardWidth = computed(() => {
    if (!width.value) {
      return '100%';
    }
    const gap = 16; // gap-4 translates to 1rem (16px)
    const totalGap = (actualItemsToShow.value - 1) * gap;
    return `calc((100% - ${totalGap}px) / ${actualItemsToShow.value})`;
  });

  const checkScroll = (): void => {
    if (!trackRef.value) {
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = trackRef.value;

    isScrollable.value = scrollWidth > clientWidth + 2;
    canScrollLeft.value = scrollLeft > 2;
    canScrollRight.value = Math.ceil(scrollLeft + clientWidth) < scrollWidth - 2;
  };

  const scrollByAmount = (direction: 1 | -1): void => {
    if (!trackRef.value || trackRef.value.children.length === 0) {
      return;
    }
    const firstCard = trackRef.value.children[0] as HTMLElement;
    const cardWidth = firstCard.offsetWidth;
    const gapString = window.getComputedStyle(trackRef.value).gap;
    const gap = parseFloat(gapString) || 16;
    const scrollAmount = cardWidth + gap;

    trackRef.value.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' });
  };

  const updateItemCount = (): void => {
    if (trackRef.value) {
      const count = trackRef.value.children.length;
      if (itemCount.value !== count) {
        itemCount.value = count;
      }
    }
  };

  onMounted(() => {
    updateItemCount();
    setTimeout(checkScroll, 100);
    useEventListener(window, 'resize', checkScroll);
  });

  onUpdated(() => {
    updateItemCount();
    setTimeout(checkScroll, 50);
  });

  return {
    trackRef,
    canScrollLeft,
    canScrollRight,
    isScrollable,
    cardWidth,
    checkScroll,
    scrollByAmount
  };
};
