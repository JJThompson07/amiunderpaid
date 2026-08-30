export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const country = query.country ? String(query.country).toLowerCase() : 'gb';
  const targetCountry = country === 'usa' || country === 'us' ? 'us' : 'gb';

  const appId = config.adzunaAppId;
  const appKey = config.adzunaAppKey;

  if (!appId || !appKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Market data credentials are not configured.'
    });
  }

  try {
    const response = await $fetch(
      `https://api.adzuna.com/v1/api/jobs/${targetCountry}/categories`,
      {
        params: {
          app_id: appId,
          app_key: appKey,
          content_type: 'application/json'
        }
      }
    );
    return response;
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Market data temporarily unavailable.'
    });
  }
});
