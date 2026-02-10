// server/api/adzuna/salary.ts
export default defineEventHandler(async (event) => {
  const { title, location, country, resultsPerPage } = getQuery(event);
  const config = useRuntimeConfig();
  const countryCode = country === 'us' ? 'us' : 'gb';

  const titleEncoded = encodeURIComponent(title as string);

  // The Histogram endpoint provides the job search results with salary information
  const url = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1?app_id=${config.ADZUNA_APP_ID}&app_key=${config.ADZUNA_APP_KEY}&results_per_page=${resultsPerPage}&location0=${country}&location1=${location}&what=${titleEncoded}&content-type=application/json`;

  try {
    const data = await $fetch(url);

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not fetch distribution data';
    return { error: message };
  }
});
