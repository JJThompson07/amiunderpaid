<template>
  <transition
    enter-active-class="transition duration-500 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      @click.self="$emit('update:modelValue', false)">
      <div
        class="w-full max-w-3xl bg-white shadow-2xl rounded-3xl overflow-hidden animate-in fade-in duration-200 max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div v-if="title" class="p-6 border-b border-slate-100 bg-slate-300/50">
          <h3 class="text-lg md:text-xl font-bold text-secondary-900">{{ title }}</h3>
        </div>

        <!-- Content -->
        <div class="overflow-scroll flex-1">
          <slot />
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <slot name="footer">
            <button
              class="text-xs font-bold text-slate-400 hover:text-slate-600 px-4 py-2 cursor-pointer"
              @click="$emit('update:modelValue', false)">
              {{ $t('common.close') }}
            </button>
          </slot>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  }
});
defineEmits(['update:modelValue']);
</script>
