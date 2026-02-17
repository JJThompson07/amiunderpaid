import algoliasearch from 'algoliasearch';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const indexName = body.indexName || 'job_titles';

  const appId = process.env.ALGOLIA_APPLICATION_ID;
  const apiKey = process.env.ALGOLIA_ADMIN_API_KEY || process.env.ALGOLIA_API_KEY;

  if (!appId || !apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Algolia Admin credentials missing'
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
      statusMessage: error.message
    });
  }
});
