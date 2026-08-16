import { createError, defineEventHandler, readBody } from 'h3';
import algoliasearch from 'algoliasearch';

export default defineEventHandler(async (event) => {
  await verifyAdmin(event);
  const body = await readBody(event);
  const { indexName, filters } = body;

  if (!indexName || !filters) {
    throw createError({ statusCode: 400, message: 'Missing indexName or filters' });
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
  } catch (error: any) {
    throw createError({ statusCode: 500, message: 'Failed to clear search index.' });
  }
});
