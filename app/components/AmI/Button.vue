<template>
  <div
    ref="buttonAnimated"
    class="relative overflow-hidden rounded-lg p-1 select-none"
    :class="[bgColour, textColour]">
    <section class="relative z-10 flex h-full flex-col rounded-md bg-inherit">
      <slot />
    </section>
    <span
      v-for="index in 4"
      :key="index"
      :class="
        ['hovered', `hovered-${index}`, isHovered ? animationColour : 'bg-transparent'].join(' ')
      "></span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementHover } from '@vueuse/core'

const buttonAnimated = ref<HTMLElement | null>(null)
const isHovered = useElementHover(buttonAnimated)

defineProps({
  bgColour: {
    type: String,
    default: 'bg-primary-500',
  },
  textColour: {
    type: String,
    default: 'text-white',
  },
  animationColour: {
    type: String,
    default: 'bg-primary-300',
  },
})
</script>

<style scoped>
.hovered {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  transition: all 300ms ease-in-out;
}

.hovered-1 {
  width: 100%;
  height: 10px;
  left: -100%;
  top: 0;
  animation: moveRight 2000ms linear infinite;
}

.hovered-2 {
  width: 10px;
  height: 100%;
  top: -100%;
  right: 0;
  animation: moveDown 2000ms linear infinite;
  animation-delay: 500ms;
}

.hovered-3 {
  width: 100%;
  height: 10px;
  left: 100%;
  bottom: 0;
  animation: moveLeft 2000ms linear infinite;
  animation-delay: 1000ms;
}

.hovered-4 {
  width: 10px;
  height: 100%;
  top: 100%;
  left: 0;
  animation: moveUp 2000ms linear infinite;
  animation-delay: 1500ms;
}

@keyframes spin {
  from {
    transform: rotate(-60deg);
  }
  to {
    transform: rotate(300deg);
  }
}

@keyframes moveRight {
  0% {
    left: -100%;
  }
  50% {
    left: 100%;
  }
  100% {
    left: 100%;
  }
}

@keyframes moveLeft {
  0% {
    left: 100%;
  }
  50% {
    left: -100%;
  }
  100% {
    left: -100%;
  }
}

@keyframes moveDown {
  0% {
    top: -100%;
  }
  50% {
    top: 100%;
  }
  100% {
    top: 100%;
  }
}

@keyframes moveUp {
  0% {
    top: 100%;
  }
  50% {
    top: -100%;
  }
  100% {
    top: -100%;
  }
}
</style>
