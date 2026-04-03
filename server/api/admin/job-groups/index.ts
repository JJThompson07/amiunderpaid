// server/api/admin/job-groups.get.ts
import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const country = query.country === 'USA' ? 'USA' : 'UK';
  const collectionName = country === 'USA' ? 'usa_job_groups' : 'uk_job_groups';

  const db = getFirestore();

  try {
    const snapshot = await db.collection(collectionName).get();

    const groups = snapshot.docs.map((doc) => ({
      id_code: doc.id, // The document ID is the SOC code!
      group_name: doc.data().group_name || 'Unknown Group',
      titles: doc.data().titles || []
    }));

    // Sort numerically/alphabetically by the SOC code
    groups.sort((a, b) => a.id_code.localeCompare(b.id_code));

    return { success: true, groups };
  } catch (error) {
    console.error('Error fetching job groups:', error);
    throw createError({ statusCode: 500, message: 'Failed to fetch job groups' });
  }
});
