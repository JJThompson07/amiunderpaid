import { createError, defineEventHandler, readBody } from 'h3';
import algoliasearch from 'algoliasearch';

// the only indices the admin pages write to (seed.vue: benchmarks, coding-index.vue: job_titles)
const ALLOWED_INDICES = ['job_titles', 'regional_salary_benchmarks', 'salary_benchmarks'];

export default defineEventHandler(async (event) => {
  await verifyAdmin(event);
  const config = useRuntimeConfig();
  const body = await readBody(event);
  const { indexName, filters } = body;

  if (!indexName || !filters) {
    throw createError({ statusCode: 400, message: 'Missing indexName or filters' });
  }

  if (!ALLOWED_INDICES.includes(indexName)) {
    throw createError({ statusCode: 400, message: 'Invalid search index' });
  }

  const appId = config.algoliaApplicationId;
  const apiKey = config.algoliaAdminApiKey;

  if (!appId || !apiKey) {
    throw createError({ statusCode: 500, message: 'Search service is misconfigured.' });
  }

  const client = algoliasearch(appId, apiKey);
  const index = client.initIndex(indexName);

  try {
    await index.deleteBy({ filters });
    return { success: true };
  } catch {
    throw createError({ statusCode: 500, message: 'Failed to clear search index.' });
  }
});
