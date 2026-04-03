import { getFirestore } from 'firebase-admin/firestore';
import algoliasearch from 'algoliasearch';

export default defineEventHandler(async (event) => {
  console.log('\n--- STARTING MIGRATION DEBUG ---');

  try {
    const body = await readBody(event);
    const country = body?.country;
    console.log(`[DEBUG 1] Target Country:`, country);

    if (!country) throw new Error('Country is missing from request body');

    // 1. ENVIRONMENT CHECK
    const appId = process.env.ALGOLIA_APPLICATION_ID;
    const adminKey = process.env.ALGOLIA_ADMIN_KEY;

    console.log(`[DEBUG 2] Algolia App ID found?`, !!appId);
    console.log(`[DEBUG 3] Algolia Admin Key found?`, !!adminKey);

    if (!appId || !adminKey) {
      throw new Error('Algolia credentials missing from .env variables');
    }

    const client = algoliasearch(appId, adminKey);
    const indexName = country === 'USA' ? 'usa_job_groups' : 'uk_job_groups';
    const index = client.initIndex(indexName);
    console.log(`[DEBUG 4] Algolia Index targeted:`, indexName);

    // 2. FIRESTORE CHECK
    console.log(`[DEBUG 5] Connecting to Firestore...`);
    const db = getFirestore();
    const collectionName = country === 'USA' ? 'usa_job_groups' : 'uk_job_groups';

    console.log(`[DEBUG 6] Fetching from collection:`, collectionName);
    const snapshot = await db.collection(collectionName).get();

    console.log(`[DEBUG 7] Firestore snapshot empty?`, snapshot.empty);
    if (snapshot.empty) {
      throw new Error(`No documents found in Firestore collection: ${collectionName}`);
    }

    // 3. DATA MAPPING
    const groups: any[] = [];
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

    console.log(`[DEBUG 8] Successfully mapped to ${groups.length} Algolia chunks.`);

    // 4. ALGOLIA PUSH
    console.log(`[DEBUG 9] Applying settings to Algolia...`);
    await index.setSettings({
      searchableAttributes: ['group_name', 'titles'],
      removeWordsIfNoResults: 'allOptional',
      // NEW: Group chunks together so users don't see duplicate search results
      attributeForDistinct: 'gov_id',
      distinct: 1
    });
    console.log(`[DEBUG 10] Settings applied successfully.`);

    console.log(`[DEBUG 11] Pushing records to Algolia...`);
    const response = await index.saveObjects(groups);

    console.log(`[DEBUG 12] SUCCESS! Saved ${response.objectIDs.length} records.`);
    console.log('--- MIGRATION DEBUG FINISHED ---\n');

    return { success: true, count: response.objectIDs.length };
  } catch (error: any) {
    // 5. ERROR CATCHER
    console.error('\n--- !!! MIGRATION FAILED !!! ---');
    console.error('ERROR MESSAGE:', error.message);
    console.error('FULL ERROR:', error);
    console.error('--------------------------------\n');

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to sync with Algolia.'
    });
  }
});
