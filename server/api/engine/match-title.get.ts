// server/api/engine/match-title.get.ts
import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const searchTitle = ((query.title as string) || '').toLowerCase().trim();
  const country = query.country === 'USA' ? 'USA' : 'UK';

  if (!searchTitle) return { success: false, matches: [] };

  const db = getFirestore();
  const collectionName = country === 'USA' ? 'usa_job_groups' : 'uk_job_groups';

  try {
    const snapshot = await db
      .collection(collectionName)
      .where('titles', 'array-contains', searchTitle)
      .get();

    if (snapshot.empty) {
      return { success: true, matches: [] };
    }

    const matches = snapshot.docs.map((doc) => ({
      id_code: doc.id,
      group_name: doc.data().group_name
    }));

    return { success: true, matches };
  } catch (error) {
    console.error('Error matching synonym:', error);
    throw createError({ statusCode: 500, message: 'Failed to match title' });
  }
});
