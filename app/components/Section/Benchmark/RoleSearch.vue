<template>
  <BaseSearchForm
    mode="benchmark"
    :initial-country="initialCountry"
    @country-change="emit('countryChange', $event)" />
</template>

<script setup lang="ts">
defineProps<{
  initialCountry?: string;
}>();

const emit = defineEmits<{
  (e: 'countryChange', country: string): void;
}>();
</script>
