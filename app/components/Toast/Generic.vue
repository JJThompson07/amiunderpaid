<template>
  <ClientOnly>
    <Teleport to="body">
      <transition v-bind="transitionConfig">
        <div v-if="modelValue" :class="containerClasses">
          <div
            :class="[
              'shadow-xl border backdrop-blur-sm pointer-events-auto',
              fullWidth ? 'rounded-2xl w-full max-w-6xl mx-auto' : 'rounded-2xl w-full',
              bgClasses
            ]">
            <div :class="fullWidth ? 'p-5 sm:p-6' : 'p-4'">
              <slot>
                <div class="flex items-start gap-3">
                  <div class="flex-1">
                    <h3 v-if="title" class="text-sm font-bold text-slate-900">{{ title }}</h3>
                    <p class="text-sm text-slate-600 mt-1">{{ message }}</p>
                  </div>
                  <button
                    class="shrink-0 ml-4 text-slate-400 hover:text-slate-600 transition-colors"
                    @click="$emit('update:modelValue', false)">
                    <span class="sr-only">Close</span>
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </slot>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount, computed } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  bgClasses: { type: String, default: 'bg-white/90 border-slate-200' },
  fullWidth: { type: Boolean, default: false },
  direction: {
    type: String,
    default: 'right', // 'right' or 'bottom'
    validator: (value: string) => ['right', 'bottom'].includes(value)
  },
  zIndexClass: { type: String, default: 'z-[100]' }
});

const emit = defineEmits(['update:modelValue']);

// 1. Dynamic Positioning Classes
const containerClasses = computed(() => {
  // We use pointer-events-none on the wrapper so users can click the page *behind* the toast
  const base = 'fixed z-[100] pointer-events-none flex';

  if (props.fullWidth) {
    // Banner style: Spans the bottom of the screen with some padding
    return `${base} bottom-0 left-0 w-full p-4 sm:p-6`;
  }

  // Standard Toast: Bottom right, ~250px wide (max-w-sm gives a little breathing room up to 384px)
  return `${base} bottom-6 right-6 w-full max-w-[250px] sm:max-w-sm`;
});

// 2. Dynamic Transition Animation
const transitionConfig = computed(() => {
  // If it's full width, we ALWAYS want it to slide up from the bottom
  if (props.fullWidth || props.direction === 'bottom') {
    return {
      enterActiveClass: 'transform ease-out duration-300 transition',
      enterFromClass: 'translate-y-full opacity-0',
      enterToClass: 'translate-y-0 opacity-100',
      leaveActiveClass: 'transition ease-in duration-200',
      leaveFromClass: 'opacity-100',
      leaveToClass: 'translate-y-full opacity-0'
    };
  }

  // Default: Slide in from the right
  return {
    enterActiveClass: 'transform ease-out duration-300 transition',
    enterFromClass: 'translate-x-full opacity-0',
    enterToClass: 'translate-x-0 opacity-100',
    leaveActiveClass: 'transition ease-in duration-200',
    leaveFromClass: 'opacity-100',
    leaveToClass: 'translate-x-full opacity-0'
  };
});

// Timer Logic
let timeoutId: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen && props.duration > 0) {
      timeoutId = setTimeout(() => {
        emit('update:modelValue', false);
      }, props.duration);
    } else if (!isOpen && timeoutId) {
      clearTimeout(timeoutId);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (timeoutId) clearTimeout(timeoutId);
});
</script>
