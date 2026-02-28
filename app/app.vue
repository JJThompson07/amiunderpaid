<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script lang="ts" setup>
const { locale } = useI18n();

useHead({
  htmlAttrs: {
    lang: locale.value // This will correctly set it to 'en-GB' or 'en-US'
  }
});
</script>
