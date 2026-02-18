// server/api/adzuna/salary.ts
import { FieldValue } from 'firebase-admin/firestore';
import { generateCacheKey, sanitizeAdzunaData } from '~~/server/utils/adzuna';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const { title, location, country } = query;

  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Job title is required' });
  }

  const titleStr = String(title);
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

  try {
    const docSnap = await cacheRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      // Cache valid for 7 days (604,800,000 ms)
      const now = new Date().getTime();
      const cachedTime = data?.timestamp?.toMillis() || 0;

      if (now - cachedTime < 604800000) {
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
    throw createError({
      statusCode: 500,
      statusMessage: 'Adzuna API credentials are not configured.'
    });
  }

  const params: Record<string, any> = {
    app_id: appId,
    app_key: appKey,
    what: titleStr,
    'content-type': 'application/json'
    // location0: countryCode === 'us' ? 'US' : 'UK'
  };

  if (locationStr.trim() !== '') {
    params.location1 = locationStr;
  }

  // 3. Fetch from Adzuna API
  try {
    const rawData = await $fetch(`https://api.adzuna.com/v1/api/jobs/${countryCode}/histogram`, {
      params
    });

    const cleanData = sanitizeAdzunaData(rawData);

    // 4. Save to Cache (Server-Side)
    await cacheRef.set({
      data: cleanData,
      timestamp: FieldValue.serverTimestamp(),
      searchParams: { title: titleStr, location: locationStr, country: countryCode }
    });

    return rawData;
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch Adzuna salary histogram for ${countryCode}`,
      data: e
    });
  }
});
