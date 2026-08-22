/**
 * Market Data Endpoint (Salary)
 *
 * This endpoint acts as an API gateway. It attempts to fetch data from the
 * primary provider (Adzuna). If the primary provider returns a 429 Rate Limit error,
 * this endpoint catches the error and seamlessly falls back to a secondary provider (Reed),
 * mapping the response to a unified schema.
 * The client does not need to know which provider was ultimately used.
 */
import { FieldValue } from 'firebase-admin/firestore';
import type { MarketDataProvider } from '~~/shared/utils/market-data';
import { sanitizeAdzunaData } from '~~/shared/utils/sanitize';
import { ADZUNA_LOCATION_MAP } from '../../constants/locations';

type AdzunaHistogramParams = {
  app_id: string;
  app_key: string;
  what: string;
  'content-type': string;
  where?: string;
};

// Loosely typed: sanitizeAdzunaData strips reserved keys from whatever the
// upstream provider (Adzuna or the Reed/Jooble fallback) returned, so the
// exact shape varies beyond the fields this endpoint relies on.
type MarketSalaryResult = {
  histogram?: Record<string, number>;
  provider: MarketDataProvider;
  categoryTag?: string;
  [key: string]: unknown;
};

// Define the cached fetcher outside the event handler
const fetchFromProviders = defineCachedFunction(
  async (
    params: AdzunaHistogramParams,
    countryCode: string,
    titleStr: string,
    locationStr: string,
    isDevOrE2e: boolean,
    devProviderOverride?: string
  ) => {
    try {
      // e2e runs never hit the real Reed/Jooble APIs — return a static fixture
      // directly. The manual local-dev provider toggle (import.meta.dev, not
      // process.env.E2E) still falls through to the real fake-429 path below
      // so a developer can verify real fallback-provider integration.
      const isE2E = process.env.E2E === 'true';
      if (isE2E && (devProviderOverride === 'reed' || devProviderOverride === 'jooble')) {
        const { getMockFallbackHistogram } = await import('../../utils/fallback');
        return getMockFallbackHistogram(devProviderOverride);
      }

      if (isDevOrE2e && devProviderOverride === 'reed') {
        throw createError({ statusCode: 429, statusMessage: 'Dev Override' });
      }
      if (isDevOrE2e && devProviderOverride === 'jooble') {
        throw createError({ statusCode: 429, statusMessage: 'Dev Override' });
      }

      const rawData = await $fetch(`https://api.adzuna.com/v1/api/jobs/${countryCode}/histogram`, {
        params
      });

      const cleanData = sanitizeAdzunaData(rawData) as MarketSalaryResult;
      const hasData = cleanData?.histogram && Object.keys(cleanData.histogram).length > 0;

      if (hasData) {
        cleanData.provider = 'adzuna';
        return cleanData;
      } else {
        throw createError({ statusCode: 404, statusMessage: 'Zero results from Adzuna' });
      }
    } catch (e) {
      const statusCode =
        (e as { response?: { status?: number }; statusCode?: number })?.response?.status ||
        (e as { statusCode?: number })?.statusCode;
      if (statusCode === 429 || statusCode === 403 || statusCode === 404) {
        const { executeMarketFallback } = await import('../../utils/fallback');
        const fallbackRaw = await executeMarketFallback(titleStr, locationStr, countryCode, '', '');

        return {
          histogram: fallbackRaw.histogram,
          provider: fallbackRaw.provider
        };
      }
      throw e;
    }
  },
  {
    maxAge: 60 * 60, // Keep in memory for 1 hour to prevent stampedes
    name: 'marketSalaryProviderFetch',
    getKey: (params, countryCode, titleStr, locationStr, isDevOrE2e, devProviderOverride) =>
      `${titleStr}-${locationStr}-${countryCode}-${devProviderOverride || 'none'}`
  }
);

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const { title, location, country } = query;

  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Job title is required' });
  }

  const titleStr = String(title).toLowerCase().trim();

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
  const cacheKey = generateCacheKey(titleStr, locationStr, countryCode);
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
    } catch {
      // Silently ignore cache read errors and fall back to fetching from the Adzuna API
    }
  }

  // 2. Prepare API Credentials
  const appId = config.adzunaAppId;
  const appKey = config.adzunaAppKey;

  if (!appId || !appKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Market data service is misconfigured.'
    });
  }

  const params: AdzunaHistogramParams = {
    app_id: appId,
    app_key: appKey,
    what: titleStr,
    'content-type': 'application/json'
  };

  if (locationStr.trim() !== '') {
    let cleanLocation = locationStr.split(',')[0]!.trim();
    const slug = cleanLocation.toLowerCase().replace(/\s+/g, '-');
    if (ADZUNA_LOCATION_MAP[slug]) {
      cleanLocation = ADZUNA_LOCATION_MAP[slug];
    }
    params.where = cleanLocation;
  }

  // 3. Fetch from Providers (Wrapped in cachedFunction to prevent stampedes)
  try {
    const cleanData: MarketSalaryResult = await fetchFromProviders(
      params,
      countryCode,
      titleStr,
      locationStr,
      isDevOrE2e,
      devProviderOverride
    );

    const isFallbackProvider = !!cleanData.provider && cleanData.provider !== 'adzuna';

    // FIX 2: Adzuna histogram data doesn't contain categories!
    // Let's try to steal the category tag from the jobs cache for this exact search.
    // Skip this for fallback-provider responses: a long per-category cacheDays
    // read from the jobs cache must never leak onto short-lived fallback data.
    let categoryTag = 'unknown';
    if (!isFallbackProvider) {
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
      // Fallback-provider (Reed/Jooble) data is a smaller, lower-confidence
      // sample and should expire quickly so it doesn't outlive the transient
      // Adzuna failure that produced it, regardless of the configured cacheDays.
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
      searchParams: { title: titleStr, location: locationStr, country: countryCode }
    });

    return cleanData;
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Salary data temporarily unavailable. Please try again later.'
    });
  }
});
