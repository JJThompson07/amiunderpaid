<template>
  <div>
    <BrandBenchmarkHome v-if="$siteBrand === 'benchmarkmyrole'" />
    <BrandAmIHome v-else />
  </div>
</template>

<script setup lang="ts">
const { $siteBrand } = useNuxtApp();
</script>
