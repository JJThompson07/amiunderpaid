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

    // Get start boundaries for today and yesterday
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    const [countSnapshot, oldestSnapshot, latestSnapshot, todaySnapshot, yesterdaySnapshot] =
      await Promise.all([
        collectionRef.count().get(),
        collectionRef.orderBy('timestamp', 'asc').limit(1).get(),
        collectionRef.orderBy('timestamp', 'desc').limit(100).get(),
        // New queries for today and yesterday
        collectionRef.where('timestamp', '>=', startOfToday).count().get(),
        collectionRef
          .where('timestamp', '>=', startOfYesterday)
          .where('timestamp', '<', startOfToday)
          .count()
          .get()
      ]);

    const totalCount = countSnapshot.data().count;
    const todayCount = todaySnapshot.data().count;
    const yesterdayCount = yesterdaySnapshot.data().count;

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

    // 👈 Return todayCount and yesterdayCount to the frontend
    return {
      success: true,
      totalCount,
      todayCount,
      yesterdayCount,
      oldestDate,
      averagePerDay,
      logs
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: (error as Error)?.message || 'Failed to fetch search history'
    });
  }
});
