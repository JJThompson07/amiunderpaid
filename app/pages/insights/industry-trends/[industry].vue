<template>
  <div class="min-h-screen pt-24 pb-12">
    <SectionSharedBackdrop bg-from="from-slate-900/15" />

    <section class="relative px-4 pb-12">
      <div class="max-w-5xl mx-auto">
        <div class="mb-10 text-center">
          <h1 class="text-3xl font-black text-slate-900 md:text-4xl">
            {{ t('insights.spoke.h1', { industry: industryLabel }) }}
          </h1>
          <p class="max-w-2xl mx-auto mt-4 text-lg text-slate-500">
            {{ $t('insights.intro') }}
          </p>
        </div>

        <div class="flex items-center justify-between mb-4">
          <NuxtLink
            to="/insights/industry-trends"
            class="flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition-colors bg-white border rounded-full text-slate-600 border-slate-200 hover:bg-slate-50">
            <ArrowLeft class="w-3.5 h-3.5" aria-hidden="true" />
            {{ $t('insights.spoke.backToHub') }}
          </NuxtLink>

          <div class="flex items-center gap-2">
            <label for="spoke-industry-select" class="text-xs font-bold text-slate-400">
              {{ $t('insights.spoke.industrySelectLabel') }}
            </label>
            <select
              id="spoke-industry-select"
              :value="categoryTag"
              class="px-3 py-1.5 text-xs font-bold border rounded-full text-slate-600 border-slate-200 bg-white"
              @change="handleIndustryChange">
              <option
                v-for="industry in allIndustries"
                :key="industry.categoryTag"
                :value="industry.categoryTag">
                {{ industry.label }}
              </option>
            </select>
          </div>
        </div>

        <SectionSharedIndustryTrendsChart :initial-industry-tag="categoryTag" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next';
import { industryTrendsCacheKey } from '~/composables/useIndustryTrends';
import type { IndustryTrendsResponse } from '~~/shared/utils/market-data';

const { t } = useI18n();
const { $siteBrand } = useNuxtApp();
const { currentCountry } = useRegion();
const route = useRoute();

// A plain (non-reactive) read: currentCountry is derived from the request's
// locale/domain, which doesn't change client-side for this app, so unlike
// categoryTag below it never needs to react to an in-page navigation.
const country = currentCountry.value === 'USA' ? 'us' : 'gb';

// Awaited (unlike the non-blocking useIndustryTrends() the chart component
// uses) so the industry's label is resolved before this page's <title>/<meta>
// render during SSR, and so an unknown tag can 404 for real rather than
// rendering an empty page that crawlers would see as a soft-404. Shares its
// cache key with useIndustryTrends(), so the chart component's own call below
// reuses this fetch instead of firing a second one.
const { data } = await useAsyncData<IndustryTrendsResponse>(industryTrendsCacheKey(country), () =>
  $fetch<IndustryTrendsResponse>('/api/market-data/industry-trends', { params: { country } })
);

const allIndustries = computed(() => data.value?.industries ?? []);

// Reactive to route.params -- the top-right select below switches between two
// spoke URLs via navigateTo(), which Vue Router resolves within the same
// route record ([industry].vue) and so reuses this component instance rather
// than remounting it. A plain (one-time) const here would go stale after the
// first switch.
const categoryTag = computed(() => route.params.industry as string);

const matchedIndustry = computed(() =>
  allIndustries.value.find((industry) => industry.categoryTag === categoryTag.value)
);

// Real 404 for a bad initial URL/crawl request (this runs synchronously
// during setup, before the reactive watch below ever fires).
if (!matchedIndustry.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });
}

// Re-checked reactively for the same reason categoryTag is a computed: a
// client-side switch to an unrecognized tag (shouldn't happen via the select,
// which only ever lists real tags, but is possible via a stale link) should
// still 404 rather than silently render whatever the last-good state was.
watch(matchedIndustry, (found) => {
  if (!found) {
    showError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });
  }
});

const industryLabel = computed(() => matchedIndustry.value?.label ?? categoryTag.value);

useSeoMeta({
  title: () =>
    $siteBrand === 'benchmarkmyrole'
      ? t('insights.spoke.benchmarkTitle', { industry: industryLabel.value })
      : t('insights.spoke.title', { industry: industryLabel.value }),
  description: () => t('insights.spoke.description', { industry: industryLabel.value }),
  ogTitle: () =>
    $siteBrand === 'benchmarkmyrole'
      ? t('insights.spoke.benchmarkTitle', { industry: industryLabel.value })
      : t('insights.spoke.title', { industry: industryLabel.value })
});

const handleIndustryChange = (event: Event): void => {
  const newTag = (event.target as HTMLSelectElement).value;
  navigateTo(`/insights/industry-trends/${newTag}`);
};
</script>
