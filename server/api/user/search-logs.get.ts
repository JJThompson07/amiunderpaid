import { getFirestore } from 'firebase-admin/firestore';

export interface SearchLog {
  id: string;
  title: string;
  country: string;
  location: string | null;
  salary: number | null;
  schedule: string | null;
  contract: string | null;
  brand: string | null;
  formattedDate: string;
}

export default defineEventHandler(async () => {
  const db = getFirestore();

  try {
    const collectionRef = db.collection('search_history');

    // 1. Get the TOTAL lifetime count efficiently using Aggregation
    const countSnapshot = await collectionRef.count().get();
    const totalCount = countSnapshot.data().count;

    // 2. Get the latest 100 documents for the table
    const snapshot = await collectionRef.orderBy('timestamp', 'desc').limit(100).get();

    const logs: SearchLog[] = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        title: data.title || '',
        country: data.country || '',
        location: data.location || null,
        salary: data.salary || null,
        schedule: data.schedule || null,
        contract: data.contract || null,
        brand: data.brand || null,
        formattedDate: data.timestamp?.toDate
          ? data.timestamp.toDate().toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Unknown'
      };
    });

    // 3. Return the totalCount alongside the logs
    return { success: true, totalCount, logs };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: (error as Error)?.message || 'Failed to fetch search history'
    });
  }
});
