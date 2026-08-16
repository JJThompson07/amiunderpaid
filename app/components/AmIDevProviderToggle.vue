<template>
  <div class="w-full max-w-sm mb-4">
    <AmITabs
      v-model="override"
      :label="'Dev Mode Provider'"
      :options="options"
      bg-colour="bg-slate-200"
      text-colour="text-slate-500"
      hover-colour="hover:text-primary-400"
      button-colour="bg-primary-500"
      button-text-colour="text-white"
    />
  </div>
</template>

<script setup lang="ts">
const override = useDevProviderOverride();

const options = [
  { label: 'Auto', value: 'auto' },
  { label: 'Adzuna', value: 'adzuna' },
  { label: 'Reed', value: 'reed' }
];
</script>
