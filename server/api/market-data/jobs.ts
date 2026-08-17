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

  const devProviderOverride = process.dev ? (query.devProvider as string) : undefined;
  const skipCache = process.dev && !!devProviderOverride;

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

  const params: Record<string, any> = {
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

  // 3. Fetch from Adzuna API
  try {
    if (import.meta.dev && devProviderOverride === 'reed') {
      throw createError({ statusCode: 429, statusMessage: 'Dev Override' });
    }
    if (import.meta.dev && devProviderOverride === 'jooble') {
      throw createError({ statusCode: 429, statusMessage: 'Dev Override' });
    }

    const rawData = await $fetch(`https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`, {
      params
    });

    const cleanData = sanitizeAdzunaData(rawData);
    
    // If Adzuna succeeded and found results, use it!
    if (cleanData.count && cleanData.count > 0) {
      const categoryTag = cleanData.results?.[0]?.category?.tag || 'unknown';

      // --- CALCULATE EXPIRES AT ---
      let cacheDays = 120; // Default
      if (categoryTag !== 'unknown') {
        try {
          const catSnap = await db.collection('adzuna_category').doc(categoryTag).get();
          if (catSnap.exists) {
            cacheDays = Number(catSnap.data()?.cache || 120);
          }
        } catch {
          // Silently ignore failures and default to 120 cacheDays
        }
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + cacheDays);
      
      cleanData.provider = 'adzuna';

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
    } else {
      // Fall through to fallback on 0 results!
      throw createError({ statusCode: 404, statusMessage: 'Zero results from Adzuna' });
    }
  } catch (e: any) {
    const statusCode = e?.response?.status || e?.statusCode;
    // Fallback if Adzuna is rate-limited, forbidden, or returned 0 results
    if (statusCode === 429 || statusCode === 403 || statusCode === 404) {
      try {
        const { executeMarketFallback } = await import('../../utils/fallback');
        const fallbackRaw = await executeMarketFallback(titleStr, locationStr, countryCode, typeStr, contractStr);
        
        const fallbackData = {
          mean: fallbackRaw.mean,
          count: fallbackRaw.count,
          results: fallbackRaw.results.slice(0, limit),
          provider: fallbackRaw.provider
        };

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Cache Fallback for 24h

        await cacheRef.set(
          {
            categoryTag: 'unknown',
            data: fallbackData,
            timestamp: FieldValue.serverTimestamp(),
            expiresAt: expiresAt,
            searchParams: { title: titleStr, location: locationStr, country: countryCode },
            gov_id_code: existingGovIdCode || null,
            is_admin_verified: isAdminVerified,
            job_type: typeStr,
            contract_type: contractStr
          },
          { merge: true }
        );

        return {
          ...fallbackData,
          gov_id_code: existingGovIdCode,
          is_admin_verified: isAdminVerified
        };
      } catch (fallbackErr) {
        console.error('Jobs Fallback Error:', fallbackErr);
        throw createError({
          statusCode: 503,
          statusMessage: 'Market data temporarily unavailable. Please try again later.'
        });
      }
    }

    console.error('Jobs Primary Error:', e);
    throw createError({
      statusCode: 503,
      statusMessage: 'Market data temporarily unavailable. Please try again later.'
    });
  }
});
