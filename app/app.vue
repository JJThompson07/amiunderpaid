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

onMounted(() => {
  if (import.meta.dev) return; // Do not log local development sessions

  if (!sessionStorage.getItem('session_logged')) {
    sessionStorage.setItem('session_logged', 'true');
    // Fire and forget
    $fetch('/api/analytics/session', { method: 'POST' }).catch(() => {});
  }
});
</script>
