<template>
  <div>
    <SectionSharedBackdrop bg-from="from-slate-900/15" />
    <BrandBenchmarkFaq v-if="$siteBrand === 'benchmarkmyrole'" />
    <BrandAmIFaq v-else />
  </div>
</template>

<script setup lang="ts">
const { $siteBrand } = useNuxtApp();
</script>
