import { FieldValue } from 'firebase-admin/firestore';

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
  } catch (e) {
    console.warn('Firestore cache read failed:', e);
  }

  // 2. Prepare API Credentials
  const appId = config.adzunaAppId || config.public?.adzunaAppId || process.env.adzunaAppId;
  const appKey = config.adzunaAppKey || config.public?.adzunaAppKey || process.env.adzunaAppKey;

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

    // FIX 2: Adzuna histogram data doesn't contain categories!
    // Let's try to steal the category tag from the jobs cache for this exact search.
    let categoryTag = 'unknown';
    try {
      // The default limit for jobs is 5, so we check that cache key
      const jobsCacheKey = `${cacheKey}-5`;
      const jobsDoc = await db.collection('adzuna_jobs_cache').doc(jobsCacheKey).get();
      if (jobsDoc.exists) {
        categoryTag = jobsDoc.data()?.categoryTag || 'unknown';
      }
    } catch (err) {
      console.warn('Could not pull category tag from jobs cache', err);
    }

    // --- CALCULATE EXPIRES AT ---
    let cacheDays = 120; // Default
    if (categoryTag !== 'unknown') {
      try {
        const catSnap = await db.collection('adzuna_category').doc(categoryTag).get();
        if (catSnap.exists) {
          cacheDays = Number(catSnap.data()?.cache || 120);
        }
      } catch (err) {
        console.warn('Could not fetch category rules for expiration time', err);
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + cacheDays);

    // 4. Save to Cache (Server-Side)
    await cacheRef.set({
      categoryTag,
      data: cleanData,
      timestamp: FieldValue.serverTimestamp(),
      expiresAt: expiresAt, // <-- Save the exact expiration date!
      searchParams: { title: titleStr, location: locationStr, country: countryCode }
    });

    // FIX 3: Return the safely sanitized data instead of rawData
    return cleanData;
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch Adzuna salary histogram for ${countryCode}`,
      data: e
    });
  }
});
