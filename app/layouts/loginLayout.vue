<template>
  <div class="flex flex-col min-h-screen font-sans text-slate-900">
    <slot />
  </div>
</template>

<script setup lang="ts">
const { $siteBrand } = useNuxtApp();

// Ensure the login layout also knows which tenant's favicon to load!
useHead({
  link: [{ rel: 'icon', type: 'image/x-icon', href: `/${$siteBrand}-favicon.ico` }]
});
</script>

<style scoped></style>
