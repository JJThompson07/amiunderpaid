<template>
  <section class="max-w-4xl mx-auto px-4 mt-8 pb-12 select-none">
    <h3 class="text-xs font-bold text-slate-400 mb-5 text-center uppercase tracking-widest">
      {{ $t('landing.trending.heading') }}
    </h3>
    <div class="flex flex-wrap justify-center gap-2.5">
      <NuxtLink
        v-for="role in trendingRoles"
        :key="role"
        :to="getRoleUrl(role)"
        class="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-all duration-300 shadow-sm hover:shadow">
        {{ role }}
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { slugify } from '~/helpers/utility';

const { tm } = useI18n();
const { currentCountry } = useRegion();

const trendingRoles = computed(() => {
  const roles = tm('landing.trending.roles');
  return Array.isArray(roles) ? roles : [];
});

const getRoleUrl = (role: string) => {
  return `/salary/${slugify(role)}/${currentCountry.value}`;
};
</script>

<style scoped></style>
