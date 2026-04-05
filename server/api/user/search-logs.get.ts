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

    const [countSnapshot, oldestSnapshot, latestSnapshot] = await Promise.all([
      collectionRef.count().get(),
      collectionRef.orderBy('timestamp', 'asc').limit(1).get(),
      collectionRef.orderBy('timestamp', 'desc').limit(100).get()
    ]);

    const totalCount = countSnapshot.data().count;

    let oldestDate = 'the beginning';
    let averagePerDay = 0;

    if (!oldestSnapshot.empty && oldestSnapshot.docs[0]) {
      const oldestData = oldestSnapshot.docs[0].data();
      if (oldestData.timestamp) {
        // Format the UI date
        oldestDate = oldestData.timestamp.toDate().toLocaleDateString('en-GB', {
          month: 'short',
          year: 'numeric'
        });

        // 👈 NEW: Calculate the average searches per day
        const now = Date.now();
        const oldestMs = oldestData.timestamp.toMillis();
        const diffMs = now - oldestMs;

        // Convert ms to days (Math.max prevents dividing by 0 if it's the very first day)
        const daysElapsed = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        averagePerDay = Math.round(totalCount / daysElapsed);
      }
    }

    const logs: SearchLog[] = latestSnapshot.docs.map((doc) => {
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

    // 👈 Return averagePerDay to the frontend
    return { success: true, totalCount, oldestDate, averagePerDay, logs };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: (error as Error)?.message || 'Failed to fetch search history'
    });
  }
});
