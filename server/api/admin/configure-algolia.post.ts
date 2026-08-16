import algoliasearch from 'algoliasearch';

export default defineEventHandler(async (event) => {
  await verifyAdmin(event);
  const config = useRuntimeConfig();
  const body = await readBody(event);
  const indexName = body.indexName || 'job_titles';

  const appId = config.algoliaApplicationId;
  const apiKey = config.algoliaAdminApiKey;

  if (!appId || !apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Search service is misconfigured.'
    });
  }

  const client = algoliasearch(appId, apiKey);
  const index = client.initIndex(indexName);

  try {
    await index.setSettings({
      searchableAttributes: ['searchTitle', 'title', 'soc'],
      typoTolerance: true,
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 8,
      ignorePlurals: true,
      removeStopWords: true
    });
    return { success: true };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to configure search index.'
    });
  }
});
