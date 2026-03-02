<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const i18nHead = useLocaleHead({
  seo: true // This single flag now handles SEO and direction attributes
});

useHead({
  htmlAttrs: {
    lang: computed(() => i18nHead.value.htmlAttrs?.lang),
    // Use type assertion to match the expected 'ltr' | 'rtl' | 'auto' type
    dir: computed(() => i18nHead.value.htmlAttrs?.dir as 'ltr' | 'rtl' | 'auto' | undefined)
  },
  link: computed(() => [...(i18nHead.value.link || [])]),
  meta: computed(() => [...(i18nHead.value.meta || [])])
});
</script>
