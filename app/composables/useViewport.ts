import { useWindowSize } from '@vueuse/core';

export const useViewport = () => {
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
