// Shared with industry-trends.ts's defineCachedFunction `name` option -- keep
// these in sync so invalidateIndustryTrendsCache() below targets the exact
// same Nitro cache entries that endpoint populates.
export const INDUSTRY_TRENDS_CACHE_NAME = 'industryTrendsFetch';

// Nitro's defineCachedFunction builds its storage key as
// [base, group, name, key + '.json'].join(':'), where base defaults to
// '/cache' and group defaults to 'nitro/functions' (confirmed against
// nitropack's own source: node_modules/nitropack/dist/runtime/internal/cache.mjs).
// industry-trends.ts's getKey returns the country code verbatim as the key,
// so these are the exact two storage keys it reads and writes.
const buildCacheKey = (countryCode: 'gb' | 'us'): string =>
  ['/cache', 'nitro/functions', INDUSTRY_TRENDS_CACHE_NAME, `${countryCode}.json`].join(':');

// Call after a sync writes fresh data to adzuna_industry_trends. Without
// this, /api/market-data/industry-trends keeps serving its cached response
// for up to its 24h maxAge regardless of how recently the underlying
// Firestore data changed (confirmed live: a successful sync run updated
// Firestore but the public endpoint kept returning the pre-sync snapshot
// until this was added).
export const invalidateIndustryTrendsCache = async (): Promise<void> => {
  const storage = useStorage();
  await Promise.all(
    (['gb', 'us'] as const).map((country) => storage.removeItem(buildCacheKey(country)))
  );
};
