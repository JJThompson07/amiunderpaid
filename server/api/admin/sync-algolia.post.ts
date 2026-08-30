import { createError, defineEventHandler, isError, readBody } from 'h3';
import algoliasearch from 'algoliasearch';

type SyncAlgoliaRequestBody = {
  data: Record<string, unknown>[];
  indexName: string;
};

export default defineEventHandler(async (event) => {
  const body = await readBody<SyncAlgoliaRequestBody>(event);
  const { data, indexName } = body;

  if (!data || !Array.isArray(data)) {
    throw createError({ statusCode: 400, message: 'Invalid data format' });
  }

  const config = useRuntimeConfig();

  if (!config.algoliaAdminApiKey || !config.algoliaApplicationId) {
    throw createError({
      statusCode: 500,
      message: 'Search index credentials are not configured.'
    });
  }

  const client = algoliasearch(config.algoliaApplicationId, config.algoliaAdminApiKey);
  const index = client.initIndex(indexName);

  try {
    // Configure index settings for filtering (idempotent)
    // We ensure 'country' is available for filtering in SalarySearch.vue
    await index.setSettings({
      searchableAttributes: ['title', 'searchTitle', 'location', 'searchLocation'],
      attributesForFaceting: [
        'filterOnly(country)',
        'filterOnly(year)',
        'filterOnly(period)',
        'filterOnly(id_code)', // Required for UK SOC code lookup
        'filterOnly(searchTitle)',
        'filterOnly(searchLocation)',
        'searchable(location)', // Searchable facet for autocomplete
        'searchable(title)' // Searchable facet for autocomplete
      ]
    });

    // Save objects (upsert)
    // We expect data to have 'objectID' set to match Firestore ID
    const { objectIDs } = await index.saveObjects(data, { autoGenerateObjectIDIfNotExist: true });

    return {
      success: true,
      count: objectIDs.length,
      message: `Synced ${objectIDs.length} records to Algolia index '${indexName}'`
    };
  } catch (error) {
    if (isError(error)) {
      throw error;
    }
    throw createError({ statusCode: 500, message: 'Error syncing search index' });
  }
});
