/**
 * Market Data Endpoint (Jobs)
 *
 * This endpoint acts as an API gateway with region-aware primary/fallback
 * routing:
 *   - UK (gb): Reed is primary, Adzuna is the fallback.
 *   - USA (us): Adzuna is primary, Jooble is the fallback.
 * If the regional primary provider fails or returns zero results, this
 * endpoint seamlessly falls back to the regional secondary provider, mapping
 * the response to a unified schema. The client does not need to know which
 * provider was ultimately used.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { fetchAdzunaJobs } from '../../utils/adzuna';
import { fetchReedData } from '../../utils/reed';
import type { JobSearchResponse, MarketDataProvider } from '~~/shared/utils/market-data';

// Duck-typed shape covering both an ofetch `FetchError` (`.response.status`)
// and an h3 error thrown via `createError` (`.statusCode`), without requiring
// the caught value to actually be an instance of either class. Every error a
// provider utility (reed.ts/adzuna.ts/jooble.ts) throws -- whether a genuine
// HTTP failure or our own "zero results" signal -- carries one of these, so
// checking for it distinguishes a provider-layer failure (fallback-worthy)
// from an unrelated bug (which should still surface as a real error).
type FetchLikeError = {
  response?: { status?: number };
  statusCode?: number;
};

const isProviderFailure = (e: unknown): boolean => {
  const err = e as FetchLikeError;
  return typeof (err.response?.status ?? err.statusCode) === 'number';
};

type ProviderFetchArgs = {
  countryCode: string;
  titleStr: string;
  locationStr: string;
  typeStr: string;
  contractStr: string;
  categoryStr?: string;
};

const fetchByProviderName = async (
  provider: string,
  args: ProviderFetchArgs
): Promise<JobSearchResponse> => {
  const { countryCode, titleStr, locationStr, typeStr, contractStr, categoryStr } = args;
  if (provider === 'reed') {
    return fetchReedData(titleStr, locationStr, typeStr, contractStr, categoryStr);
  }
  if (provider === 'jooble') {
    const { fetchJoobleData } = await import('../../utils/jooble');
    return fetchJoobleData(titleStr, locationStr, typeStr, contractStr, categoryStr);
  }
  return fetchAdzunaJobs(titleStr, locationStr, countryCode, typeStr, contractStr, categoryStr);
};

const fetchRegionalPrimary = async (args: ProviderFetchArgs): Promise<JobSearchResponse> => {
  const { countryCode, titleStr, locationStr, typeStr, contractStr, categoryStr } = args;
  const result =
    countryCode === 'gb'
      ? await fetchReedData(titleStr, locationStr, typeStr, contractStr, categoryStr)
      : await fetchAdzunaJobs(
          titleStr,
          locationStr,
          countryCode,
          typeStr,
          contractStr,
          categoryStr
        );

  if (!result.count || result.count <= 0) {
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
    typeStr: string,
    contractStr: string,
    limit: number,
    isDevOrE2e: boolean,
    devProviderOverride?: string,
    categoryStr?: string
  ): Promise<JobSearchResponse> => {
    const args: ProviderFetchArgs = {
      countryCode,
      titleStr,
      locationStr,
      typeStr,
      contractStr,
      categoryStr
    };

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
        const { getMockFallbackJobs } = await import('../../utils/fallback');
        const mockJobs = getMockFallbackJobs(devProviderOverride as MarketDataProvider);
        return { ...mockJobs, results: mockJobs.results.slice(0, limit) };
      }

      const pinned = await fetchByProviderName(devProviderOverride, args);
      return { ...pinned, results: pinned.results.slice(0, limit) };
    }

    try {
      const primary = await fetchRegionalPrimary(args);
      return { ...primary, results: primary.results.slice(0, limit) };
    } catch (e) {
      if (!isProviderFailure(e)) {
        throw e;
      }
      const { executeMarketFallback } = await import('../../utils/fallback');
      const fallbackRaw = await executeMarketFallback(
        titleStr,
        locationStr,
        countryCode,
        typeStr,
        contractStr,
        categoryStr
      );

      return {
        mean: fallbackRaw.mean,
        count: fallbackRaw.count,
        histogram: fallbackRaw.histogram,
        results: fallbackRaw.results.slice(0, limit),
        provider: fallbackRaw.provider
      };
    }
  },
  {
    maxAge: 60 * 60, // Keep in memory for 1 hour to prevent stampedes
    name: 'marketJobsProviderFetch',
    getKey: (
      countryCode,
      titleStr,
      locationStr,
      typeStr,
      contractStr,
      limit,
      isDevOrE2e,
      devProviderOverride,
      categoryStr
    ) =>
      `${titleStr}-${locationStr}-${countryCode}-${typeStr}-${contractStr}-${limit}-${devProviderOverride || 'none'}-${categoryStr || 'none'}`
  }
);

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { title, location, country, resultsPerPage, jobType, contractType, category } = query;

  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Job title is required' });
  }

  // Force to lowercase to prevent Cache Key Mismatches after URL unslugifying!
  const titleStr = String(title).toLowerCase().trim();
  const typeStr = String(jobType || 'full-time').toLowerCase();
  const contractStr = String(contractType || 'permanent').toLowerCase();
  // The user-supplied industry filter -- kept distinct from the `categoryTag`
  // below, which is derived from result data and only used for cache-TTL
  // lookups against the `adzuna_categories` collection (doc ID
  // `${uk|usa}-${categoryTag}`, matching how /admin/adzuna writes it).
  const categoryStr = category ? String(category).toLowerCase().trim() : '';

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

  // Credentials are validated by whichever provider utility is actually
  // invoked (reed.ts / adzuna.ts / jooble.ts) — each reads its own secret
  // exclusively via private runtimeConfig and throws a 500 if misconfigured.
  // A misconfigured *primary* provider is treated the same as any other
  // primary failure below: it gracefully falls back to the regional
  // secondary provider rather than hard-failing the request. Only a
  // misconfiguration of BOTH the primary and the fallback provider surfaces
  // as an error, via the outer try/catch's generic 503.

  // 1. Check Cache
  const db = useAdminFirestore();
  const cacheKey = `${generateCacheKey(titleStr, locationStr, countryCode, categoryStr)}-${typeStr}-${contractStr}-${limit}`;
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

        // --- STALE PROVIDER INVALIDATION ---
        // A UK request whose cached document was written by anything other
        // than Reed (i.e. before Reed became the UK primary provider, or a
        // fallback-sourced record) is treated as a cache miss so it's
        // immediately refreshed with real Reed data instead of silently
        // serving pre-migration Adzuna-primary data forever.
        const isStaleUkProvider = countryCode === 'gb' && data?.data?.provider !== 'reed';

        if (!isStaleUkProvider) {
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
              const categoryDocId = `${countryCode === 'us' ? 'usa' : 'uk'}-${categoryTag}`;
              const categoryCacheRef = db.collection('adzuna_categories').doc(categoryDocId);
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
      }
    } catch {
      // Silently ignore cache read errors and fall back to fetching live data
    }
  }

  // 2. Fetch from Providers (Wrapped in cachedFunction to prevent stampedes)
  try {
    const cleanData: JobSearchResponse = await fetchFromProviders(
      countryCode,
      titleStr,
      locationStr,
      typeStr,
      contractStr,
      limit,
      isDevOrE2e,
      devProviderOverride,
      categoryStr
    );

    // --- CALCULATE EXPIRES AT ---
    // If the caller filtered by an explicit industry, that's the most accurate
    // TTL lookup key. Otherwise fall back to the category of the top result.
    const categoryTag = categoryStr || cleanData.results?.[0]?.category?.tag || 'unknown';
    // Region-aware: the UK primary is Reed, the USA primary is Adzuna. Any
    // other provider on the response means the regional fallback fired.
    const isFallbackProvider =
      !!cleanData.provider &&
      (countryCode === 'gb' ? cleanData.provider !== 'reed' : cleanData.provider !== 'adzuna');

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
          const categoryDocId = `${countryCode === 'us' ? 'usa' : 'uk'}-${categoryTag}`;
          const catSnap = await db.collection('adzuna_categories').doc(categoryDocId).get();
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

    // 4. Save to Cache
    await cacheRef.set(
      {
        categoryTag,
        data: cleanData,
        timestamp: FieldValue.serverTimestamp(),
        expiresAt: expiresAt, // <-- Save the exact expiration date!
        searchParams: {
          title: titleStr,
          location: locationStr,
          country: countryCode,
          category: categoryStr || null
        },
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
