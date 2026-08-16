<template>
  <section class="w-full mt-8 pb-12 select-none overflow-hidden">
    <h3 class="text-xs font-bold text-slate-400 mb-5 text-center uppercase tracking-widest px-4">
      {{ $t('landing.trending.heading') }}
    </h3>
    
    <!-- Marquee Wrapper -->
    <div class="relative flex w-full group">
      <!-- Duplicate content to ensure infinite scroll -->
      <div 
        class="flex animate-marquee gap-4 whitespace-nowrap min-w-full px-2 group-hover:[animation-play-state:paused]"
      >
        <NuxtLink
          v-for="item in trendingRoles"
          :key="`first-${item.title}`"
          :to="getRoleUrl(item.title)"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-all duration-300 shadow-sm hover:shadow"
        >
          <span>{{ item.title }}</span>
          <span class="text-slate-400 font-normal">&bull;</span>
          <span class="font-semibold text-slate-700">{{ formatSalary(item.salary) }}</span>
        </NuxtLink>
      </div>

      <div 
        class="flex animate-marquee gap-4 whitespace-nowrap min-w-full px-2 group-hover:[animation-play-state:paused]"
        aria-hidden="true"
      >
        <NuxtLink
          v-for="item in trendingRoles"
          :key="`second-${item.title}`"
          :to="getRoleUrl(item.title)"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-all duration-300 shadow-sm hover:shadow"
          tabindex="-1"
        >
          <span>{{ item.title }}</span>
          <span class="text-slate-400 font-normal">&bull;</span>
          <span class="font-semibold text-slate-700">{{ formatSalary(item.salary) }}</span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRegion } from '~/composables/useRegion';
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

const formatSalary = (salary: number) => {
  return new Intl.NumberFormat(
    currentCountry.value === 'UK' ? 'en-GB' : 'en-US', 
    { style: 'currency', currency: currentCountry.value === 'UK' ? 'GBP' : 'USD', maximumFractionDigits: 0 }
  ).format(salary);
};
</script>

<style scoped></style>
