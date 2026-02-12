export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const countryParam = String(query.country || 'gb').toLowerCase();

  // Adzuna uses 'gb' for UK and 'us' for USA
  const countryCode = countryParam === 'usa' || countryParam === 'us' ? 'us' : 'gb';

  try {
    const data = await $fetch(`https://api.adzuna.com/v1/api/jobs/${countryCode}/categories`, {
      params: {
        app_id: config.adzunaId,
        app_key: config.adzunaKey,
        'content-type': 'application/json'
      }
    });
    return data;
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch Adzuna categories for ${countryCode}`,
      data: e
    });
  }
});
