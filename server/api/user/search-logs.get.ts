import { getFirestore } from 'firebase-admin/firestore';

// 1. Define the exact shape of the outgoing data (matches your frontend!)
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
  // await verifyAdmin(event);

  const db = getFirestore();

  try {
    const snapshot = await db
      .collection('search_history')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    // 2. Explicitly tell TypeScript that `logs` is an array of `SearchLog`
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

    return { success: true, logs };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: (error as Error)?.message || 'Failed to fetch search history'
    });
  }
});
