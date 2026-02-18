// server/api/adzuna/jobs.ts
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

  // If the location is just the country name, treat it as empty to get national stats
  const countryAliases =
    countryCode === 'us'
      ? ['us', 'usa', 'united states', 'america']
      : ['uk', 'gb', 'united kingdom', 'britain'];

  if (countryAliases.includes(locationStr.toLowerCase().trim())) {
    locationStr = '';
  }

  // 1. Check Cache
  const db = useAdminFirestore();
  // Include limit in cache key so requesting 10 results doesn't return a cached 5 results
  const cacheKey = `${generateCacheKey(titleStr, locationStr, countryCode)}-${limit}`;
  const cacheRef = db.collection('adzuna_jobs_cache').doc(cacheKey);

  try {
    const docSnap = await cacheRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      const now = new Date().getTime();
      const cachedTime = data?.timestamp?.toMillis() || 0;

      if (now - cachedTime < 86400000) {
        // 24 hours
        return data?.data;
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

    // ** FIX: Sanitize data to remove '__CLASS__' before saving **
    const cleanData = sanitizeAdzunaData(rawData);

    // 4. Save to Cache
    await cacheRef.set({
      data: cleanData,
      timestamp: FieldValue.serverTimestamp(),
      searchParams: { title: titleStr, location: locationStr, country: countryCode }
    });

    return cleanData;
  } catch (e: any) {
    // Return detailed error if something goes wrong
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch Adzuna jobs for ${countryCode}`,
      data: e?.message || e
    });
  }
});
