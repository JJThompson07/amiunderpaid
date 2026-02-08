<template>
  <nav
    class="flex items-center gap-2 my-6 text-xs font-medium text-slate-300/80 flex-wrap"
    aria-label="Breadcrumb">
    <ol class="flex items-center gap-2 flex-wrap">
      <li>
        <NuxtLink to="/" class="flex items-center gap-1 hover:text-white transition-colors">
          <Home class="w-3 h-3" />
          Home
        </NuxtLink>
      </li>
      <li class="text-slate-300 select-none">/</li>
      <li>
        <NuxtLink to="/" class="hover:text-white transition-colors"> Salaries </NuxtLink>
      </li>
      <li class="text-slate-300 select-none">/</li>
      <li>
        <NuxtLink
          :to="`/salary/${route.params.title}/${route.params.country}`"
          class="hover:text-white transition-colors">
          {{ displayTitle }}
        </NuxtLink>
      </li>
      <li class="text-slate-300 select-none">/</li>
      <li>
        <NuxtLink
          :to="`/salary/${route.params.title}/${route.params.country}`"
          class="hover:text-white transition-colors">
          {{ country }}
        </NuxtLink>
      </li>
      <li v-if="location" class="text-slate-300 select-none">/</li>
      <li v-if="location" class="text-slate-100" aria-current="page">{{ location }}</li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import type { RouteLocationNormalizedGeneric } from 'vue-router';

defineProps<{
  route: RouteLocationNormalizedGeneric;
  displayTitle: string;
  country: string;
  location?: string;
}>();
</script>

<style scoped></style>
