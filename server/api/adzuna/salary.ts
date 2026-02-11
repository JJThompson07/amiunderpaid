// server/api/adzuna/salary.ts
export default defineEventHandler(async (event) => {
  const { title, location, country } = getQuery(event);
  const config = useRuntimeConfig();

  const code = country === 'us' ? 'us' : 'gb';

  const titleEncoded = encodeURIComponent(title as string);

  // The Histogram endpoint provides the salary distribution (the "buckets")
  let url = `https://api.adzuna.com/v1/api/jobs/${code}/histogram?app_id=${config.ADZUNA_APP_ID}&app_key=${config.ADZUNA_APP_KEY}&what=${titleEncoded}&content-type=application/json`;

  // Add location parameters if they exist
  url += `&location0=${country === 'us' ? 'US' : 'UK'}`; // Country is required for Adzuna API, even if it's just "UK" or "US"
  if (location && String(location).trim() !== '') {
    url += `&location1=${encodeURIComponent(location as string)}`;
  }

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
