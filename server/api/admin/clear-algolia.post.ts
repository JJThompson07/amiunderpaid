import { defineEventHandler, readBody, createError } from 'h3';
import algoliasearch from 'algoliasearch';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { indexName, filters } = body;

  if (!indexName || !filters) {
    throw createError({ statusCode: 400, message: 'Missing indexName or filters' });
  }

  if (!process.env.ALGOLIA_ADMIN_KEY || !process.env.ALGOLIA_APPLICATION_ID) {
    throw createError({ statusCode: 500, message: 'Algolia credentials missing' });
  }

  const client = algoliasearch(process.env.ALGOLIA_APPLICATION_ID, process.env.ALGOLIA_ADMIN_KEY);
  const index = client.initIndex(indexName);

  try {
    await index.deleteBy({ filters });
    return { success: true };
  } catch (error: any) {
    console.error('Algolia Clear Error:', error);
    throw createError({ statusCode: 500, message: error.message });
  }
});
