export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const country = query.country ? String(query.country).toLowerCase() : 'gb';
  const targetCountry = country === 'usa' ? 'us' : country;

  const appId = config.adzunaAppId || config.public?.adzunaAppId || process.env.adzunaAppId;
  const appKey = config.adzunaAppKey || config.public?.adzunaAppKey || process.env.adzunaAppKey;

  if (!appId || !appKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Adzuna API credentials are not configured.'
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
  } catch (e: any) {
    throw createError({
      statusCode: e.response?.status || 500,
      statusMessage: `Failed to fetch Adzuna categories for ${targetCountry}`,
      data: e.data
    });
  }
});
