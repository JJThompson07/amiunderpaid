/**
 * Market Data Endpoint (Salary)
 *
 * This endpoint acts as an API gateway with region-aware primary/fallback
 * routing:
 *   - UK (gb): Reed is primary, Adzuna is the fallback.
 *   - USA (us): Adzuna is primary, Jooble is the fallback.
 * If the regional primary provider fails or returns an empty histogram, this
 * endpoint seamlessly falls back to the regional secondary provider, mapping
 * the response to a unified schema. The client does not need to know which
 * provider was ultimately used.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { fetchAdzunaHistogram } from '../../utils/adzuna';
import { fetchReedData } from '../../utils/reed';
import type { MarketDataProvider } from '~~/shared/utils/market-data';

// Duck-typed shape covering both an ofetch `FetchError` (`.response.status`)
// and an h3 error thrown via `createError` (`.statusCode`), without requiring
// the caught value to actually be an instance of either class. See jobs.ts
// for the full rationale -- this distinguishes a provider-layer failure
// (fallback-worthy) from an unrelated bug (which should still surface).
type FetchLikeError = {
  response?: { status?: number };
  statusCode?: number;
};

const isProviderFailure = (e: unknown): boolean => {
  const err = e as FetchLikeError;
  return typeof (err.response?.status ?? err.statusCode) === 'number';
};

type MarketSalaryResult = {
  histogram: Record<string, number>;
  provider: MarketDataProvider;
};

type ProviderFetchArgs = {
  countryCode: string;
  titleStr: string;
  locationStr: string;
  categoryStr?: string;
};

const isEmptyHistogram = (histogram?: Record<string, number>): boolean =>
  !histogram || Object.keys(histogram).length === 0;

const fetchByProviderName = async (
  provider: string,
  args: ProviderFetchArgs
): Promise<MarketSalaryResult> => {
  const { countryCode, titleStr, locationStr, categoryStr } = args;
  if (provider === 'reed') {
    const result = await fetchReedData(titleStr, locationStr, '', '', categoryStr);
    return { histogram: result.histogram ?? {}, provider: result.provider };
  }
  if (provider === 'jooble') {
    const { fetchJoobleData } = await import('../../utils/jooble');
    const result = await fetchJoobleData(titleStr, locationStr, '', '', categoryStr);
    return { histogram: result.histogram ?? {}, provider: result.provider };
  }
  return fetchAdzunaHistogram(titleStr, locationStr, countryCode, categoryStr);
};

const fetchRegionalPrimary = async (args: ProviderFetchArgs): Promise<MarketSalaryResult> => {
  const { countryCode, titleStr, locationStr, categoryStr } = args;

  let result: MarketSalaryResult;
  if (countryCode === 'gb') {
    const reedResult = await fetchReedData(titleStr, locationStr, '', '', categoryStr);
    result = { histogram: reedResult.histogram ?? {}, provider: reedResult.provider };
  } else {
    result = await fetchAdzunaHistogram(titleStr, locationStr, countryCode, categoryStr);
  }

  if (isEmptyHistogram(result.histogram)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Zero results from primary market data provider'
    });
  }
  return result;
};

// Define the cached fetcher outside the event handler
const fetchFromProviders = defineCachedFunction(
  async (
    countryCode: string,
    titleStr: string,
    locationStr: string,
    isDevOrE2e: boolean,
    devProviderOverride?: string,
    categoryStr?: string
  ): Promise<MarketSalaryResult> => {
    const args: ProviderFetchArgs = { countryCode, titleStr, locationStr, categoryStr };

    // Dev/local-toggle provider pin: bypass normal primary/fallback
    // resolution and go straight to the requested provider.
    if (isDevOrE2e && devProviderOverride && devProviderOverride !== 'auto') {
      // e2e runs never hit the real Reed/Jooble/Adzuna APIs for a pinned
      // provider -- return a static fixture directly, so e2e assertions
      // never depend on a live third-party call succeeding. The manual
      // local-dev provider toggle (import.meta.dev, not process.env.E2E)
      // still calls the real provider below so a developer can verify real
      // integration behavior.
      const isE2E = process.env.E2E === 'true';
      if (isE2E) {
        const { getMockFallbackHistogram } = await import('../../utils/fallback');
        return getMockFallbackHistogram(devProviderOverride as MarketDataProvider);
      }

      return fetchByProviderName(devProviderOverride, args);
    }

    try {
      return await fetchRegionalPrimary(args);
    } catch (e) {
      if (!isProviderFailure(e)) {
        throw e;
      }
      const { executeMarketFallback } = await import('../../utils/fallback');
      const fallbackRaw = await executeMarketFallback(
        titleStr,
        locationStr,
        countryCode,
        '',
        '',
        categoryStr
      );

      return {
        histogram: fallbackRaw.histogram ?? {},
        provider: fallbackRaw.provider
      };
    }
  },
  {
    maxAge: 60 * 60, // Keep in memory for 1 hour to prevent stampedes
    name: 'marketSalaryProviderFetch',
    getKey: (countryCode, titleStr, locationStr, isDevOrE2e, devProviderOverride, categoryStr) =>
      `${titleStr}-${locationStr}-${countryCode}-${devProviderOverride || 'none'}-${categoryStr || 'none'}`
  }
);

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { title, location, country, category } = query;

  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Job title is required' });
  }

  const titleStr = String(title).toLowerCase().trim();
  // The user-supplied industry filter -- kept distinct from the `categoryTag`
  // below, which is derived data used only for cache-TTL lookups against the
  // `adzuna_category` collection.
  const categoryStr = category ? String(category).toLowerCase().trim() : '';

  const countryParam = String(country || 'gb').toLowerCase();
  const countryCode = countryParam === 'usa' || countryParam === 'us' ? 'us' : 'gb';

  let locationStr = location ? String(location) : '';

  // If the location is just the country name, treat it as empty to get national stats
  const countryAliases =
    countryCode === 'us'
      ? ['us', 'usa', 'united states', 'america']
      : ['uk', 'gb', 'united kingdom', 'britain'];

  if (countryAliases.includes(locationStr.toLowerCase().trim())) {
    locationStr = '';
  }

  // 1. Check Cache (Server-Side)
  const db = useAdminFirestore();
  const cacheKey = generateCacheKey(titleStr, locationStr, countryCode, categoryStr);
  const cacheRef = db.collection('adzuna_distribution_cache').doc(cacheKey);

  const isDevOrE2e = import.meta.dev || process.env.E2E === 'true';
  const devProviderOverride = isDevOrE2e ? (query.devProvider as string) : undefined;
  const skipCache = isDevOrE2e && !!devProviderOverride;

  if (!skipCache) {
    try {
      const docSnap = await cacheRef.get();
      if (docSnap.exists) {
        const data = docSnap.data();
        const now = new Date().getTime();

        // --- STALE PROVIDER INVALIDATION ---
        // A UK request whose cached document was written by anything other
        // than Reed is treated as a cache miss so it's immediately refreshed
        // with real Reed data instead of silently serving pre-migration
        // Adzuna-primary data forever.
        const isStaleUkProvider = countryCode === 'gb' && data?.data?.provider !== 'reed';

        if (!isStaleUkProvider) {
          // --- OPTIMIZED CACHE CHECK ---
          if (data?.expiresAt) {
            if (now < data.expiresAt.toMillis()) {
              return {
                ...data?.data,
                gov_id_code: data?.gov_id_code || null
              };
            }
          } else {
            // --- LEGACY CACHE CHECK (Backwards compatibility for old cache) ---
            const cachedTime = data?.timestamp?.toMillis() || 0;
            const categoryTag = data?.categoryTag || data?.data?.categoryTag || '';
            let categoryCacheMilli = 120 * 24 * 60 * 60 * 1000;

            if (categoryTag) {
              const categoryCacheRef = db.collection('adzuna_category').doc(categoryTag);
              const categorySnap = await categoryCacheRef.get();
              if (categorySnap.exists) {
                const categoryData = categorySnap.data();
                const categoryCacheDays = Number(categoryData?.cache || 120);
                categoryCacheMilli = categoryCacheDays * 24 * 60 * 60 * 1000;
              }
            }

            if (now - cachedTime < categoryCacheMilli) {
              return {
                ...data?.data,
                gov_id_code: data?.gov_id_code || null
              };
            }
          }
        }
      }
    } catch {
      // Silently ignore cache read errors and fall back to fetching live data
    }
  }

  // 2. Fetch from Providers (Wrapped in cachedFunction to prevent stampedes)
  try {
    const cleanData: MarketSalaryResult = await fetchFromProviders(
      countryCode,
      titleStr,
      locationStr,
      isDevOrE2e,
      devProviderOverride,
      categoryStr
    );

    // Region-aware: the UK primary is Reed, the USA primary is Adzuna. Any
    // other provider on the response means the regional fallback fired.
    const isFallbackProvider =
      !!cleanData.provider &&
      (countryCode === 'gb' ? cleanData.provider !== 'reed' : cleanData.provider !== 'adzuna');

    // FIX 2: Adzuna histogram data doesn't contain categories!
    // If the caller filtered by an explicit industry, that's the most accurate
    // TTL lookup key. Otherwise try to steal the category tag from the jobs
    // cache for this exact search. Skip the jobs-cache steal for
    // fallback-provider responses: a long per-category cacheDays read must
    // never leak onto short-lived fallback data.
    let categoryTag = categoryStr || 'unknown';
    if (categoryTag === 'unknown' && !isFallbackProvider) {
      try {
        const jobsCacheKey = `${cacheKey}-full-time-permanent-10`;
        const jobsDoc = await db.collection('adzuna_jobs_cache').doc(jobsCacheKey).get();
        if (jobsDoc.exists) {
          categoryTag = jobsDoc.data()?.categoryTag || 'unknown';
        }
      } catch {
        // Silently ignore and leave categoryTag as 'unknown'
      }
    }

    // --- CALCULATE EXPIRES AT ---
    let expiresAt: Date;
    if (isFallbackProvider) {
      // Fallback-provider data is a smaller, lower-confidence sample and
      // should expire quickly so it doesn't outlive the transient primary
      // failure that produced it, regardless of the configured cacheDays.
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else {
      let cacheDays = 30; // Reduced from 120
      if (categoryTag !== 'unknown') {
        try {
          const catSnap = await db.collection('adzuna_category').doc(categoryTag).get();
          if (catSnap.exists) {
            cacheDays = Number(catSnap.data()?.cache || 30);
          }
        } catch {
          // Silently ignore failures
        }
      }

      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + cacheDays);
    }

    // 4. Save to Cache (Server-Side)
    await cacheRef.set({
      categoryTag,
      data: cleanData,
      timestamp: FieldValue.serverTimestamp(),
      expiresAt: expiresAt, // <-- Save the exact expiration date!
      searchParams: {
        title: titleStr,
        location: locationStr,
        country: countryCode,
        category: categoryStr || null
      }
    });

    return cleanData;
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Salary data temporarily unavailable. Please try again later.'
    });
  }
});
