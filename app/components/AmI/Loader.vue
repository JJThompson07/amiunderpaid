<template>
  <div
    class="fixed backdrop-blur-sm backdrop-brightness-50 inset-0 z-50 flex items-center justify-center w-full h-full">
    <div class="flex items-center justify-center p-4 bg-white rounded-2xl shadow-xl">
      <div class="flex flex-col items-center gap-4">
        <div
          class="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm font-medium text-slate-500">{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  message: {
    type: String,
    default: 'Loading...'
  }
});
</script>

<style scoped></style>
