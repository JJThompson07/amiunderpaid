// server/api/adzuna/salary.ts
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const { title, location, country } = query;

  const countryParam = String(country || 'gb').toLowerCase();
  const countryCode = countryParam === 'usa' || countryParam === 'us' ? 'us' : 'gb';

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
    what: title,
    'content-type': 'application/json',
    location0: countryCode === 'us' ? 'US' : 'UK'
  };

  if (location && String(location).trim() !== '') {
    params.location1 = location;
  }

  try {
    const data = await $fetch(`https://api.adzuna.com/v1/api/jobs/${countryCode}/histogram`, {
      params
    });
    return data;
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch Adzuna salary histogram for ${countryCode}`,
      data: e
    });
  }
});
