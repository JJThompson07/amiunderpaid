// server/api/admin/suggestions.get.ts
import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async () => {
  const db = getFirestore();

  try {
    // Fetch all pending suggestions, sorted by highest count first
    const snapshot = await db
      .collection('job_suggestions')
      .where('status', '==', 'pending')
      // .orderBy('count', 'desc')
      .get();

    const suggestions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, suggestions };
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    throw createError({ statusCode: 500, message: 'Failed to fetch suggestions' });
  }
});
