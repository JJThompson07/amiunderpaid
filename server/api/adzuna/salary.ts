// server/api/adzuna/salary.ts
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const { title, location, country } = query;

  const countryParam = String(country || 'gb').toLowerCase();
  const countryCode = countryParam === 'usa' || countryParam === 'us' ? 'us' : 'gb';

  const params: Record<string, any> = {
    app_id: config.ADZUNA_APP_ID,
    app_key: config.ADZUNA_APP_KEY,
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
