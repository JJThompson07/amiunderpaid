<template>
  <div class="min-h-screen pt-24 pb-12">
    <SectionSharedBackdrop bg-from="from-slate-900/15" />

    <section class="relative px-4 pb-12">
      <div class="max-w-5xl mx-auto">
        <div class="mb-10 text-center">
          <h1 class="text-3xl font-black text-slate-900 md:text-4xl">
            {{ $t('insights.header') }}
          </h1>
          <p class="max-w-2xl mx-auto mt-4 text-lg text-slate-500">
            {{ $t('insights.intro') }}
          </p>
        </div>

        <div v-if="industries.length > 0" class="flex justify-end mb-4">
          <div class="flex items-center gap-2">
            <label
              for="hub-jump-to-industry"
              class="text-xs font-bold whitespace-nowrap text-slate-400">
              {{ $t('insights.jumpToIndustry') }}
            </label>
            <select
              id="hub-jump-to-industry"
              class="px-3 py-1.5 text-xs font-bold border rounded-full text-slate-600 border-slate-200 bg-white"
              @change="handleJumpToIndustry">
              <option value="" selected disabled>
                {{ $t('insights.jumpToIndustryPlaceholder') }}
              </option>
              <option
                v-for="industry in industries"
                :key="industry.categoryTag"
                :value="industry.categoryTag">
                {{ industry.label }}
              </option>
            </select>
          </div>
        </div>

        <SectionSharedIndustryTrendsChart />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const { $siteBrand } = useNuxtApp();
const { industries } = useIndustryTrends();

useSeoMeta({
  title:
    $siteBrand === 'benchmarkmyrole'
      ? t('meta.industry-trends.benchmark.title')
      : t('meta.industry-trends.title'),
  description:
    $siteBrand === 'benchmarkmyrole'
      ? t('meta.industry-trends.benchmark.description')
      : t('meta.industry-trends.description')
});

const handleJumpToIndustry = (event: Event): void => {
  const tag = (event.target as HTMLSelectElement).value;
  if (tag) {
    navigateTo(`/insights/industry-trends/${tag}`);
  }
};
</script>
