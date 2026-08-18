import { useWindowSize } from '@vueuse/core';
import { computed, type ComputedRef } from 'vue';

type UseViewportReturn = {
  width: ReturnType<typeof useWindowSize>['width'];
  isMobile: ComputedRef<boolean>;
  isDesktop: ComputedRef<boolean>;
  isXl: ComputedRef<boolean>;
};

export const useViewport = (): UseViewportReturn => {
  const { width } = useWindowSize();
  const isMobile = computed(() => width.value < 768);
  const isDesktop = computed(() => width.value >= 1024);
  const isXl = computed(() => width.value >= 1280);

  return {
    width,
    isMobile,
    isDesktop,
    isXl
  };
};
