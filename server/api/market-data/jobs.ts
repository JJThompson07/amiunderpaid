/**
 * Market Data Endpoint (Jobs)
 *
 * This endpoint acts as an API gateway. It attempts to fetch data from the
 * primary provider (Adzuna). If the primary provider returns a 429 Rate Limit error,
 * this endpoint catches the error and seamlessly falls back to a secondary provider (Reed),
 * mapping the response to a unified schema.
 * The client does not need to know which provider was ultimately used.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { sanitizeAdzunaData } from '~~/shared/utils/sanitize';
import { ADZUNA_LOCATION_MAP } from '../../constants/locations';
import type { JobSearchResponse } from '~~/shared/utils/market-data';

// Query params sent to the Adzuna search API.
type AdzunaSearchParams = {
  app_id: string;
  app_key: string;
  results_per_page: number;
  what: string;
  'content-type': string;
  part_time?: number;
  full_time?: number;
  contract?: number;
  permanent?: number;
  where?: string;
  distance?: number;
};

// Duck-typed shape covering both an ofetch `FetchError` (`.response.status`)
// and an h3 error thrown via `createError` (`.statusCode`), without requiring
// the caught value to actually be an instance of either class.
type FetchLikeError = {
  response?: { status?: number };
  statusCode?: number;
};

// Define the cached fetcher outside the event handler
const fetchFromProviders = defineCachedFunction(
  async (
    params: AdzunaSearchParams,
    countryCode: string,
    titleStr: string,
    locationStr: string,
    typeStr: string,
    contractStr: string,
    limit: number,
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
        const { getMockFallbackJobs } = await import('../../utils/fallback');
        const mockJobs = getMockFallbackJobs(devProviderOverride);
        return { ...mockJobs, results: mockJobs.results.slice(0, limit) };
      }

      if (isDevOrE2e && devProviderOverride === 'reed') {
        throw createError({ statusCode: 429, statusMessage: 'Dev Override' });
      }
      if (isDevOrE2e && devProviderOverride === 'jooble') {
        throw createError({ statusCode: 429, statusMessage: 'Dev Override' });
      }

      const rawData = await $fetch(`https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`, {
        params
      });

      const cleanData = sanitizeAdzunaData(rawData) as JobSearchResponse;

      if (cleanData.count && cleanData.count > 0) {
        cleanData.provider = 'adzuna';
        return cleanData;
      } else {
        throw createError({ statusCode: 404, statusMessage: 'Zero results from Adzuna' });
      }
    } catch (e) {
      const err = e as FetchLikeError;
      const statusCode = err?.response?.status || err?.statusCode;
      if (statusCode === 429 || statusCode === 403 || statusCode === 404) {
        const { executeMarketFallback } = await import('../../utils/fallback');
        const fallbackRaw = await executeMarketFallback(
          titleStr,
          locationStr,
          countryCode,
          typeStr,
          contractStr
        );

        return {
          mean: fallbackRaw.mean,
          count: fallbackRaw.count,
          results: fallbackRaw.results.slice(0, limit),
          provider: fallbackRaw.provider
        };
      }
      throw e;
    }
  },
  {
    maxAge: 60 * 60, // Keep in memory for 1 hour to prevent stampedes
    name: 'marketJobsProviderFetch',
    getKey: (
      params,
      countryCode,
      titleStr,
      locationStr,
      typeStr,
      contractStr,
      limit,
      isDevOrE2e,
      devProviderOverride
    ) =>
      `${titleStr}-${locationStr}-${countryCode}-${typeStr}-${contractStr}-${limit}-${devProviderOverride || 'none'}`
  }
);

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const { title, location, country, resultsPerPage, jobType, contractType } = query;

  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Job title is required' });
  }

  // Force to lowercase to prevent Cache Key Mismatches after URL unslugifying!
  const titleStr = String(title).toLowerCase().trim();
  const typeStr = String(jobType || 'full-time').toLowerCase();
  const contractStr = String(contractType || 'permanent').toLowerCase();

  const countryParam = String(country || 'gb').toLowerCase();
  const countryCode = countryParam === 'usa' || countryParam === 'us' ? 'us' : 'gb';
  const limit = Number(resultsPerPage) || 10;

  let locationStr = location ? String(location) : '';

  const countryAliases =
    countryCode === 'us'
      ? ['us', 'usa', 'united states', 'america']
      : ['uk', 'gb', 'united kingdom', 'britain'];

  if (countryAliases.includes(locationStr.toLowerCase().trim())) {
    locationStr = '';
  }

  // 1. Check Cache
  const db = useAdminFirestore();
  const cacheKey = `${generateCacheKey(titleStr, locationStr, countryCode)}-${typeStr}-${contractStr}-${limit}`;
  const cacheRef = db.collection('adzuna_jobs_cache').doc(cacheKey);

  // Track existing DB state so we don't wipe it on cache refresh!
  let existingGovIdCode: string | undefined = undefined;
  let isAdminVerified: boolean = false;

  const isDevOrE2e = import.meta.dev || process.env.E2E === 'true';
  const devProviderOverride = isDevOrE2e ? (query.devProvider as string) : undefined;
  const skipCache = isDevOrE2e && !!devProviderOverride;

  if (!skipCache) {
    try {
      const docSnap = await cacheRef.get();
      if (docSnap.exists) {
        const data = docSnap.data();
        existingGovIdCode = data?.gov_id_code;
        isAdminVerified = data?.is_admin_verified || false;
        const now = new Date().getTime();

        // --- OPTIMIZED CACHE CHECK ---
        if (data?.expiresAt) {
          // If the document has our new expiresAt field, the check is instant!
          if (now < data.expiresAt.toMillis()) {
            return {
              ...data?.data,
              gov_id_code: existingGovIdCode,
              is_admin_verified: isAdminVerified
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
              gov_id_code: existingGovIdCode,
              is_admin_verified: isAdminVerified
            };
          }
        }
      }
    } catch {
      // Silently ignore cache read errors and fall back to fetching from the Adzuna API
    }
  }

  // 2. Prepare API Credentials
  // Credentials are always read from private runtimeConfig (server-only).
  // Never access via config.public or process.env — this bypasses Nuxt's validation layer
  // and risks exposing secrets to the client bundle.
  const appId = config.adzunaAppId;
  const appKey = config.adzunaAppKey;

  if (!appId || !appKey) {
    throw createError({ statusCode: 500, statusMessage: 'Market data service is misconfigured.' });
  }

  const params: AdzunaSearchParams = {
    app_id: appId,
    app_key: appKey,
    results_per_page: limit,
    what: titleStr,
    'content-type': 'application/json'
  };

  // Dynamically set full_time or part_time
  if (typeStr === 'part-time') {
    params.part_time = 1;
  } else if (typeStr === 'full-time') {
    params.full_time = 1;
  }

  // Dynamically set contract or permanent
  if (contractStr === 'contract') {
    params.contract = 1;
  } else if (contractStr === 'permanent') {
    params.permanent = 1;
  }

  if (locationStr.trim() !== '') {
    // 1. Strip out anything after a comma (e.g., "Manchester, Greater Manchester" -> "Manchester")
    let cleanLocation = locationStr.split(',')[0]!.trim();

    // Adapter Pattern: Map our internal UI slugs to Adzuna's expected strings
    const slug = cleanLocation.toLowerCase().replace(/\s+/g, '-');
    if (ADZUNA_LOCATION_MAP[slug]) {
      cleanLocation = ADZUNA_LOCATION_MAP[slug];
    }

    params.where = cleanLocation;

    // 2. Add a default search radius (e.g., 20 miles) to prevent Adzuna from returning 0 jobs
    params.distance = 20;
  }

  // 3. Fetch from Providers (Wrapped in cachedFunction to prevent stampedes)
  try {
    const cleanData: JobSearchResponse = await fetchFromProviders(
      params,
      countryCode,
      titleStr,
      locationStr,
      typeStr,
      contractStr,
      limit,
      isDevOrE2e,
      devProviderOverride
    );

    // --- CALCULATE EXPIRES AT ---
    let cacheDays = 30; // Reduced from 120
    const categoryTag = cleanData.results?.[0]?.category?.tag || 'unknown';

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

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + cacheDays);

    // 4. Save to Cache
    await cacheRef.set(
      {
        categoryTag,
        data: cleanData,
        timestamp: FieldValue.serverTimestamp(),
        expiresAt: expiresAt, // <-- Save the exact expiration date!
        searchParams: { title: titleStr, location: locationStr, country: countryCode },
        gov_id_code: existingGovIdCode || null, // Preserve admin match
        is_admin_verified: isAdminVerified, // Preserve admin status
        job_type: typeStr,
        contract_type: contractStr
      },
      { merge: true }
    );

    return {
      ...cleanData,
      gov_id_code: existingGovIdCode,
      is_admin_verified: isAdminVerified
    };
  } catch (e) {
    // eslint-disable-next-line no-console -- surfaces market-data fetch failures for debugging; no dedicated server-side error-logging utility exists
    console.error('Jobs Endpoint Error:', e);
    throw createError({
      statusCode: 503,
      statusMessage: 'Market data temporarily unavailable. Please try again later.'
    });
  }
});
