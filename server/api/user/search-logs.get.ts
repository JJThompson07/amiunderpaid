// server/api/user/search-logs.get.ts
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
  dateKey: string;
}

export default defineEventHandler(async (event) => {
  const db = getFirestore();
  const query = getQuery(event);

  // Pagination & Search params
  const page = Number(query.page) || 1;
  const limitCount = Number(query.limit) || 50;
  const offsetCount = (page - 1) * limitCount;
  const searchTerm = query.search ? String(query.search).toLowerCase().trim() : '';

  try {
    const collectionRef = db.collection('search_history');

    // Get start boundaries for today and yesterday
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    // Determine the strategy for the logs fetch
    let logsPromise;
    if (searchTerm) {
      // Hybrid Search: Fetch the last 1000 to filter in-memory since Firestore lacks full-text search
      logsPromise = collectionRef.orderBy('timestamp', 'desc').limit(1000).get();
    } else {
      // Native Pagination: Fast and optimized
      logsPromise = collectionRef
        .orderBy('timestamp', 'desc')
        .offset(offsetCount)
        .limit(limitCount)
        .get();
    }

    const [countSnapshot, oldestSnapshot, latestSnapshot, todaySnapshot, yesterdaySnapshot] =
      await Promise.all([
        collectionRef.count().get(),
        collectionRef.orderBy('timestamp', 'asc').limit(1).get(),
        logsPromise,
        collectionRef.where('timestamp', '>=', startOfToday).count().get(),
        collectionRef
          .where('timestamp', '>=', startOfYesterday)
          .where('timestamp', '<', startOfToday)
          .count()
          .get()
      ]);

    // Format raw data
    let logsRaw = latestSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    let displayTotalCount = countSnapshot.data().count;

    // Apply in-memory search filter if requested
    if (searchTerm) {
      const filtered = logsRaw.filter((log: any) => {
        const titleMatch = log.title && log.title.toLowerCase().includes(searchTerm);
        const locMatch = log.location && log.location.toLowerCase().includes(searchTerm);
        return titleMatch || locMatch;
      });

      // Update the total count to reflect the search results, then slice for the current page
      displayTotalCount = filtered.length;
      logsRaw = filtered.slice(offsetCount, offsetCount + limitCount);
    }

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

        // Calculate the average searches per day
        const nowMs = Date.now();
        const oldestMs = oldestData.timestamp.toMillis();
        const diffMs = nowMs - oldestMs;

        // Convert ms to days (Math.max prevents dividing by 0 if it's the very first day)
        const daysElapsed = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        // Use the absolute total count (not the filtered one) for the lifetime average
        averagePerDay = Math.round(countSnapshot.data().count / daysElapsed);
      }
    }

    // Map to final frontend interface
    const logs: SearchLog[] = logsRaw.map((data: any) => {
      const dateObj = data.timestamp?.toDate ? data.timestamp.toDate() : null;
      return {
        id: data.id,
        title: data.title || '',
        country: data.country || '',
        location: data.location || null,
        salary: data.salary || null,
        schedule: data.schedule || null,
        contract: data.contract || null,
        brand: data.brand || null,
        formattedDate: dateObj
          ? dateObj.toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Unknown',
        dateKey: dateObj ? dateObj.toLocaleDateString('en-GB') : 'Unknown'
      };
    });

    return {
      success: true,
      totalCount: displayTotalCount, // This correctly updates the pagination UI!
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
