<template>
  <div class="fixed top-0 left-0 w-full h-125 bg-linear-to-b z-0" :class="[bgFrom, bgTo]"></div>
</template>

<script setup lang="ts">
defineProps({
  bgFrom: {
    type: String,
    default: 'from-secondary-900'
  },
  bgTo: {
    type: String,
    default: 'to-slate-50'
  }
});
</script>

<style scoped></style>
