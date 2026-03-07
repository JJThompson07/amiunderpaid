<template>
  <div class="carousel-wrapper relative w-full group">
    <!-- Carousel Track (Where slot items are injected) -->
    <div
      ref="trackRef"
      class="carousel-track flex w-full overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar"
      @scroll="checkScroll">
      <slot />
    </div>

    <!-- Navigation Buttons (Bottom) -->
    <div class="flex items-center justify-between gap-4 px-2">
      <AmIButton
        :disabled="!canScrollLeft"
        aria-label="Scroll left"
        class="hover:scale-105 transition-all duration-500 ease-in-out px-2!"
        equal-padding
        @click="scrollByAmount(-1)">
        <ChevronLeft class="w-6 h-6" />
      </AmIButton>

      <AmIButton
        :disabled="!canScrollRight"
        aria-label="Scroll right"
        class="hover:scale-105 transition-all duration-500 ease-in-out"
        equal-padding
        @click="scrollByAmount(1)">
        <ChevronRight class="w-6 h-6" />
      </AmIButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const trackRef = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(true);

// Checks the current scroll position to show/hide navigation arrows
const checkScroll = () => {
  if (!trackRef.value) return;

  const { scrollLeft, scrollWidth, clientWidth } = trackRef.value;

  canScrollLeft.value = scrollLeft > 0;
  // Using Math.ceil to prevent rounding errors on high-DPI screens
  canScrollRight.value = Math.ceil(scrollLeft + clientWidth) < scrollWidth;
};

// Scrolls the carousel track programmatically
const scrollByAmount = (direction: 1 | -1) => {
  if (!trackRef.value) return;

  // Scrolls by 80% of the visible container width to keep a little context
  const scrollAmount = trackRef.value.clientWidth * 0.8;

  trackRef.value.scrollBy({
    left: scrollAmount * direction,
    behavior: 'smooth'
  });
};

// Attach event listeners for window resizing to re-evaluate scroll bounds
onMounted(() => {
  // Give DOM a tick to render before initial check
  setTimeout(checkScroll, 50);
  window.addEventListener('resize', checkScroll);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScroll);
});
</script>

<style scoped>
/* Hides standard scrollbars but keeps functionality */
.hide-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
.hide-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}

/* Targets immediate children inside the slot. 
  Ensures whatever you put in the slot snaps into place correctly 
  and doesn't shrink.
*/
.carousel-track > :deep(*) {
  scroll-snap-align: start;
  flex: 0 0 auto;
}

/* Simple fade transition for arrows */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
