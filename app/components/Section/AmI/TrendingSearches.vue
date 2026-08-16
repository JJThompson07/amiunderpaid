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

    <!-- Macro Stats -->
    <div v-if="macroStats" class="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto px-4">
      <!-- Bottom 10% -->
      <div class="relative bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-2xl p-5 text-center shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:bg-white transition-all duration-300 group overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div class="relative z-10">
          <div class="text-[0.65rem] font-bold tracking-widest text-slate-400 uppercase mb-1.5">Bottom 10%</div>
          <div class="text-2xl font-black text-slate-800 tracking-tight">{{ formatSalary(macroStats.p10) }}</div>
        </div>
      </div>

      <!-- Mean -->
      <div class="relative bg-white/80 backdrop-blur-xl border border-primary-200/60 rounded-2xl p-5 text-center shadow-md hover:shadow-xl hover:-translate-y-0.5 hover:bg-white transition-all duration-300 group overflow-hidden sm:scale-105 z-10 ring-1 ring-primary-100">
        <div class="absolute inset-0 bg-gradient-to-br from-primary-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div class="relative z-10">
          <div class="text-[0.65rem] font-bold tracking-widest text-primary-500 uppercase mb-1.5">National Average</div>
          <div class="text-2xl font-black text-primary-950 tracking-tight">{{ formatSalary(macroStats.mean) }}</div>
        </div>
      </div>

      <!-- Top 10% -->
      <div class="relative bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-2xl p-5 text-center shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:bg-white transition-all duration-300 group overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div class="relative z-10">
          <div class="text-[0.65rem] font-bold tracking-widest text-slate-400 uppercase mb-1.5">Top 10%</div>
          <div class="text-2xl font-black text-slate-800 tracking-tight">{{ formatSalary(macroStats.p90) }}</div>
        </div>
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
