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
        class="w-full max-w-xl bg-white shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <slot />

        <!-- Footer -->
        <div class="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            class="text-xs font-bold text-slate-400 hover:text-slate-600 px-4 py-2"
            @click="$emit('update:modelValue', false)">
            Close
          </button>
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
  }
});
defineEmits(['update:modelValue']);
</script>
