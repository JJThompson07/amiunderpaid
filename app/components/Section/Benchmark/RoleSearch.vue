<template>
  <BaseSearchForm
    mode="benchmark"
    :initial-country="initialCountry"
    @country-change="emit('country-change', $event)" />
</template>

<script setup lang="ts">
defineProps<{
  initialCountry?: string;
}>();

const emit = defineEmits(['country-change']);
</script>
