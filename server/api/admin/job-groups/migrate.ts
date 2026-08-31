import { getFirestore } from 'firebase-admin/firestore';
import algoliasearch from 'algoliasearch';
import type { AlgoliaJobGroupRecord } from '~~/shared/utils/types';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const country = body?.country;

    if (!country) {
      throw createError({ statusCode: 400, message: 'Country is missing from request body' });
    }

    // 1. ENVIRONMENT CHECK
    const config = useRuntimeConfig();
    const appId = config.algoliaApplicationId;
    const adminKey = config.algoliaAdminApiKey;

    if (!appId || !adminKey) {
      throw createError({
        statusCode: 500,
        message: 'Search index credentials are not configured.'
      });
    }

    const client = algoliasearch(appId, adminKey);
    const indexName = country === 'USA' ? 'usa_job_groups' : 'uk_job_groups';
    const index = client.initIndex(indexName);

    // 2. FIRESTORE CHECK
    const db = getFirestore();
    const collectionName = country === 'USA' ? 'usa_job_groups' : 'uk_job_groups';

    const snapshot = await db.collection(collectionName).get();

    if (snapshot.empty) {
      throw createError({ statusCode: 500, message: 'No job group records found to sync.' });
    }

    // 3. DATA MAPPING
    const groups: AlgoliaJobGroupRecord[] = [];
    const MAX_TITLES_PER_RECORD = 200; // Keeps every record safely under 10KB

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const allTitles = data.titles || [];
      const baseId = doc.id;
      const groupName = data.group_name;

      if (allTitles.length === 0) {
        groups.push({
          objectID: baseId,
          gov_id: baseId, // <-- We store the TRUE database ID here
          group_name: groupName,
          titles: []
        });
      } else {
        // Split massive arrays into smaller 200-item chunks
        for (let i = 0; i < allTitles.length; i += MAX_TITLES_PER_RECORD) {
          groups.push({
            // Creates IDs like '8112', '8112_chunk_1', '8112_chunk_2'
            objectID: i === 0 ? baseId : `${baseId}_chunk_${i / MAX_TITLES_PER_RECORD}`,
            gov_id: baseId, // <-- The TRUE database ID stays the same across all chunks
            group_name: groupName,
            titles: allTitles.slice(i, i + MAX_TITLES_PER_RECORD)
          });
        }
      }
    });

    // 4. ALGOLIA PUSH
    await index.setSettings({
      searchableAttributes: ['group_name', 'titles'],
      removeWordsIfNoResults: 'allOptional',
      // NEW: Group chunks together so users don't see duplicate search results
      attributeForDistinct: 'gov_id',
      distinct: 1
    });

    const response = await index.replaceAllObjects(groups, { safe: true });

    return { success: true, count: response.objectIDs.length };
  } catch (error) {
    // 5. ERROR CATCHER
    if (isError(error)) {
      throw error;
    }
    throw createError({ statusCode: 500, message: 'Failed to sync job groups to search index.' });
  }
});
