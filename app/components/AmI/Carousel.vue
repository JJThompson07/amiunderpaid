<template>
  <div class="carousel-wrapper relative w-full group">
    <!-- Carousel Track -->
    <div
      ref="trackRef"
      class="carousel-track grid grid-flow-col w-full overflow-x-auto py-4 px-2 gap-4 snap-x snap-mandatory hide-scrollbar -mx-2"
      :style="{ gridAutoColumns: cardWidth }"
      @scroll="checkScroll">
      <slot />
    </div>

    <!-- Navigation Buttons (Bottom) -->
    <div v-show="isScrollable" class="flex items-center justify-between gap-4 px-2 mt-2">
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
        class="hover:scale-105 transition-all duration-500 ease-in-out px-2!"
        equal-padding
        @click="scrollByAmount(1)">
        <ChevronRight class="w-6 h-6" />
      </AmIButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const {
  trackRef,
  canScrollLeft,
  canScrollRight,
  isScrollable,
  cardWidth,
  checkScroll,
  scrollByAmount
} = useCarousel();
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

/* 
  Targets immediate children inside the slot. 
  Ensures whatever you put in the slot snaps into place correctly 
  and doesn't shrink.
*/
.carousel-track > :deep(*) {
  scroll-snap-align: center; /* Changed to center for better mobile feel */
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
