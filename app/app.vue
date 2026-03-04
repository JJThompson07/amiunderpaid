<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// Pull in the global brand variable we just created
const { $siteBrand } = useNuxtApp();

// Inject a dynamic CSS class into the <html> tag
useHead({
  htmlAttrs: {
    class: `theme-${$siteBrand}`
  }
});
</script>
