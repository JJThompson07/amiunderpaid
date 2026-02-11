// server/api/adzuna/jobs.ts
export default defineEventHandler(async (event) => {
  const { title, location, country, resultsPerPage } = getQuery(event);
  const config = useRuntimeConfig();

  const code = country === 'us' ? 'us' : 'gb';
  const limit = resultsPerPage || 5;

  const titleEncoded = encodeURIComponent(title as string);

  // The Search endpoint provides job listings
  let url = `https://api.adzuna.com/v1/api/jobs/${code}/search/1?app_id=${config.ADZUNA_APP_ID}&app_key=${config.ADZUNA_APP_KEY}&results_per_page=${limit}&what=${titleEncoded}&content-type=application/json`;

  // Add location parameters if they exist
  url += `&location0=${country === 'us' ? 'US' : 'UK'}`; // Country is required for Adzuna API, even if it's just "UK" or "US"
  if (location && String(location).trim() !== '') {
    url += `&location1=${encodeURIComponent(location as string)}`;
  }

  try {
    const data = await $fetch(url);

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not fetch jobs data';
    return { error: message };
  }
});
