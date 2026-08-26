import type { ComputedRef, Ref } from 'vue';
import type { IndustryTrendEntry, IndustryTrendsResponse } from '~~/shared/utils/market-data';

type UseIndustryTrendsReturn = {
  industries: ComputedRef<IndustryTrendEntry[]>;
  loading: Ref<boolean>;
  error: ComputedRef<boolean>;
};

// Exported so the [industry].vue spoke page can issue its own *awaited*
// useAsyncData call (needed so it can throw a real 404 for an unknown tag,
// and so useSeoMeta reads a resolved label during SSR) under the identical
// cache key this non-blocking composable uses -- Nuxt dedupes by key, so the
// page's blocking fetch and this composable's later non-blocking read inside
// the chart component share one network round trip instead of two.
export const industryTrendsCacheKey = (country: 'gb' | 'us'): string =>
  `industry-trends-${country}`;

// Shared across every page/component that needs the industry-trends list (the
// hub's chart + link grid, and each spoke's chart + SEO metadata) via a single
// useAsyncData key, so navigating between them doesn't re-fetch -- and, more
// importantly, so a spoke page's dynamic <title>/<meta> can resolve from the
// SSR response instead of only after a client-side onMounted fetch, which
// would leave crawlers seeing the wrong metadata in the initial HTML.
export const useIndustryTrends = (): UseIndustryTrendsReturn => {
  const { currentCountry } = useRegion();
  const country = computed<'gb' | 'us'>(() => (currentCountry.value === 'USA' ? 'us' : 'gb'));

  const { data, pending, error } = useAsyncData<IndustryTrendsResponse>(
    industryTrendsCacheKey(country.value),
    () =>
      $fetch<IndustryTrendsResponse>('/api/market-data/industry-trends', {
        params: { country: country.value }
      }),
    { watch: [country] }
  );

  return {
    industries: computed(() => data.value?.industries ?? []),
    loading: pending,
    error: computed(() => !!error.value)
  };
};
