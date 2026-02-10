// server/api/adzuna/salary.ts
export default defineEventHandler(async (event) => {
  const { title, location, country } = getQuery(event);
  const config = useRuntimeConfig();
  const countryCode = country === 'us' ? 'us' : 'gb';

  const titleEncoded = encodeURIComponent(title as string);

  // The Histogram endpoint provides the salary distribution (the "buckets")
  const url = `https://api.adzuna.com/v1/api/jobs/${countryCode}/histogram?app_id=${config.ADZUNA_APP_ID}&app_key=${config.ADZUNA_APP_KEY}&location0=${country}&location1=${location}&what=${titleEncoded}&content-type=application/json`;

  try {
    const data = await $fetch(url);

    // Adzuna returns an object where keys are salary midpoints and values are job counts
    // Example: { "50000": 120, "60000": 85 }
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not fetch distribution data';
    return { error: message };
  }
});
