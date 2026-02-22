import { FieldValue } from 'firebase-admin/firestore';
import { generateCacheKey, sanitizeAdzunaData } from '~~/server/utils/adzuna';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const { title, location, country, resultsPerPage } = query;

  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Job title is required' });
  }

  const titleStr = String(title);
  const countryParam = String(country || 'gb').toLowerCase();
  const countryCode = countryParam === 'usa' || countryParam === 'us' ? 'us' : 'gb';
  const limit = Number(resultsPerPage) || 5;

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
  const cacheKey = `${generateCacheKey(titleStr, locationStr, countryCode)}-${limit}`;
  const cacheRef = db.collection('adzuna_jobs_cache').doc(cacheKey);

  try {
    const docSnap = await cacheRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      const now = new Date().getTime();
      const cachedTime = data?.timestamp?.toMillis() || 0;

      // Look for the tag at the root, or fall back to looking inside data
      const categoryTag = data?.categoryTag || data?.data?.categoryTag || '';

      // Default to 120 days
      let categoryCacheMilli = 120 * 24 * 60 * 60 * 1000;

      // FIX 1: Only query Firestore if we actually have a tag!
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
          gov_id_code: data?.gov_id_code || undefined // Return the matched ID if we have one
        };
      }
    }
  } catch (e) {
    console.warn('Firestore cache read failed:', e);
  }

  // 2. Prepare API Credentials
  const appId = config.ADZUNA_APP_ID || config.public?.adzunaAppId || process.env.ADZUNA_APP_ID;
  const appKey = config.ADZUNA_APP_KEY || config.public?.adzunaAppKey || process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw createError({ statusCode: 500, statusMessage: 'Adzuna API credentials missing.' });
  }

  const params: Record<string, any> = {
    app_id: appId,
    app_key: appKey,
    results_per_page: limit,
    what: titleStr,
    'content-type': 'application/json'
  };

  if (locationStr.trim() !== '') {
    params.where = locationStr;
  }

  // 3. Fetch from Adzuna API
  try {
    const rawData = await $fetch(`https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`, {
      params
    });

    const cleanData = sanitizeAdzunaData(rawData);

    // FIX 2: Safely check if results exist using optional chaining (?.)
    const categoryTag = cleanData.results?.[0]?.category?.tag || 'unknown';

    // 4. Save to Cache
    await cacheRef.set({
      categoryTag, // Save at the root level for easy indexing/cleanup
      data: cleanData,
      timestamp: FieldValue.serverTimestamp(),
      searchParams: { title: titleStr, location: locationStr, country: countryCode }
    });

    return {
      ...cleanData,
      gov_id_code: undefined // Explicitly show no ID is cached yet
    };
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch Adzuna jobs for ${countryCode}`,
      data: e?.message || e
    });
  }
});
