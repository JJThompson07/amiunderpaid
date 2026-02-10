// server/api/adzuna/salary.ts
export default defineEventHandler(async (event) => {
  const { category, location, country } = getQuery(event);
  const config = useRuntimeConfig();
  const countryCode = country === 'us' ? 'us' : 'gb';

  // The Histogram endpoint provides the salary history (the "buckets")
  const url = `https://api.adzuna.com/v1/api/jobs/${countryCode}/history?app_id=${config.ADZUNA_APP_ID}&app_key=${config.ADZUNA_APP_KEY}&location0=${country}&location1=${location}&category=${category}&content-type=application/json`;

  try {
    const data = await $fetch(url);

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not fetch history data';
    return { error: message };
  }
});
