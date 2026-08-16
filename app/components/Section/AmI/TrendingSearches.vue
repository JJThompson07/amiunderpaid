<template>
  <section class="w-full mt-8 pb-12 select-none overflow-hidden">
    <h3 class="text-xs font-bold text-slate-400 mb-5 text-center uppercase tracking-widest px-4">
      {{ $t('landing.trending.heading') }}
    </h3>
    
    <!-- Marquee Wrapper -->
    <div class="relative flex w-full group">
      <!-- Duplicate content to ensure infinite scroll -->
      <div 
        class="flex shrink-0 items-center justify-around animate-marquee gap-4 whitespace-nowrap min-w-full px-2 group-hover:[animation-play-state:paused]"
      >
        <NuxtLink
          v-for="item in trendingRoles"
          :key="`first-${item.title}`"
          :to="getRoleUrl(item.title)"
          class="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-primary-900 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 hover:border-primary-300 transition-all duration-300 shadow-sm hover:shadow-md"
        >
          <span>{{ item.title }}</span>
          <span class="text-primary-300 font-normal">&bull;</span>
          <span class="font-bold text-primary-700">AVG {{ formatSalary(item.salary) }}</span>
        </NuxtLink>
      </div>

      <div 
        class="flex shrink-0 items-center justify-around animate-marquee gap-4 whitespace-nowrap min-w-full px-2 group-hover:[animation-play-state:paused]"
        aria-hidden="true"
      >
        <NuxtLink
          v-for="item in trendingRoles"
          :key="`second-${item.title}`"
          :to="getRoleUrl(item.title)"
          class="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-primary-900 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 hover:border-primary-300 transition-all duration-300 shadow-sm hover:shadow-md"
          tabindex="-1"
        >
          <span>{{ item.title }}</span>
          <span class="text-primary-300 font-normal">&bull;</span>
          <span class="font-bold text-primary-700">AVG {{ formatSalary(item.salary) }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Macro Stats Bar -->
    <div 
      v-if="macroStats" 
      class="mt-6 text-center flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-xs font-medium text-slate-500 bg-slate-50/50 py-2.5 rounded-xl max-w-fit mx-auto px-6 border border-slate-100"
    >
      <span>
        National Average (All Roles): <strong class="text-slate-700">{{ formatSalary(macroStats.mean) }}</strong>
      </span>
      <span class="hidden md:inline text-slate-300">&bull;</span>
      <span>
        Bottom 10%: <strong class="text-slate-700">{{ formatSalary(macroStats.p10) }}</strong>
      </span>
      <span class="hidden md:inline text-slate-300">&bull;</span>
      <span>
        Top 10%: <strong class="text-slate-700">{{ formatSalary(macroStats.p90) }}</strong>
      </span>
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

const macroStats = computed(() => {
  const stats = tm('landing.trending.macro_stats');
  return stats ? (stats as { mean: number; p10: number; p90: number }) : null;
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
