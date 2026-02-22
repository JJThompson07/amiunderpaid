import { defineEventHandler, readBody, createError } from 'h3';
import algoliasearch from 'algoliasearch';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { data, indexName } = body;

  if (!data || !Array.isArray(data)) {
    throw createError({ statusCode: 400, message: 'Invalid data format' });
  }

  if (!process.env.ALGOLIA_ADMIN_KEY || !process.env.ALGOLIA_APPLICATION_ID) {
    throw createError({
      statusCode: 500,
      message: 'Algolia credentials missing in server environment'
    });
  }

  const client = algoliasearch(process.env.ALGOLIA_APPLICATION_ID, process.env.ALGOLIA_ADMIN_KEY);
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
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Error syncing algolia index',
      cause: error
    });
  }
});
