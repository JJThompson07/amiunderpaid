<template>
  <ToastGeneric
    v-model="isOpen"
    :duration="5000"
    direction="right"
    :bg-classes="theme.wrapper"
    z-index-class="z-[200]">
    <div class="flex items-start gap-3">
      <div
        :class="[
          'shrink-0 w-8 h-8 rounded-full flex items-center justify-center border',
          theme.iconBg
        ]">
        <component :is="theme.icon" :class="['w-5 h-5', theme.iconColor]" />
      </div>

      <div class="flex-1 pt-1">
        <h3 v-if="title" :class="['text-sm font-bold', theme.titleColor]">{{ title }}</h3>
        <p :class="['text-sm mt-0.5', theme.textColor]">{{ message }}</p>
      </div>

      <button :class="['shrink-0 ml-2 transition-colors', theme.closeBtn]" @click="isOpen = false">
        <span class="sr-only">Close</span>
        <X class="w-5 h-5" />
      </button>
    </div>
  </ToastGeneric>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-vue-next';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  type: {
    type: String,
    default: 'info',
    validator: (v: string) => ['success', 'error', 'info'].includes(v)
  }
});

const emit = defineEmits(['update:modelValue']);

// Sync the local v-model with the generic toast
const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

// Dynamically generate styles and icons based on the type prop
const theme = computed(() => {
  switch (props.type) {
    case 'success':
      return {
        wrapper: 'bg-positive-50 border-positive-200',
        iconBg: 'bg-positive-100 border-positive-200/50',
        iconColor: 'text-positive-600',
        titleColor: 'text-positive-900',
        textColor: 'text-positive-700',
        closeBtn: 'text-positive-400 hover:text-positive-600',
        icon: CheckCircle2
      };
    case 'error':
      return {
        wrapper: 'bg-negative-50 border-negative-200',
        iconBg: 'bg-negative-100 border-negative-200/50',
        iconColor: 'text-negative-600',
        titleColor: 'text-negative-900',
        textColor: 'text-negative-700',
        closeBtn: 'text-negative-400 hover:text-negative-600',
        icon: AlertTriangle
      };
    case 'info':
    default:
      return {
        wrapper: 'bg-neutral-50 border-neutral-200',
        iconBg: 'bg-neutral-100 border-neutral-200/50',
        iconColor: 'text-neutral-600',
        titleColor: 'text-neutral-900',
        textColor: 'text-neutral-700',
        closeBtn: 'text-neutral-400 hover:text-neutral-600',
        icon: Info
      };
  }
});
</script>
