// server/api/user/search-logs.get.ts
import { getFirestore } from 'firebase-admin/firestore';
import { defineEventHandler, getQuery, createError } from 'h3';
import { verifyAdmin } from '../../utils/firebase';

export type SearchLog = {
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
  mcaScore: string | null;
  marketAverage: number | null;
  governmentAverage: number | null;
  searchSuccess: boolean | null;
  historicalFetchedMCA: boolean | null;
  provider: string | null;
};

export default defineEventHandler(async (event) => {
  await verifyAdmin(event);
  
  const db = getFirestore();
  const query = getQuery(event);

  // Pagination & Search params
  const page = Number(query.page) || 1;
  const limitCount = Number(query.limit) || 50;
  const offsetCount = (page - 1) * limitCount;
  const searchTerm = query.search ? String(query.search).toLowerCase().trim() : '';

  try {
    let logsRaw: any[] = [];
    let displayTotalCount = 0;
    let nextCursor: string | undefined;

    const collectionRef = db.collection('search_history');
    
    // Get start boundaries for today and yesterday
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    const [countSnapshot, oldestSnapshot, todaySnapshot, yesterdaySnapshot] = await Promise.all([
      collectionRef.count().get(),
      collectionRef.orderBy('timestamp', 'asc').limit(1).get(),
      collectionRef.where('timestamp', '>=', startOfToday).count().get(),
      collectionRef
        .where('timestamp', '>=', startOfYesterday)
        .where('timestamp', '<', startOfToday)
        .count()
        .get()
    ]);

    displayTotalCount = countSnapshot.data().count;

    if (searchTerm) {
      // Algolia Search
      const config = useRuntimeConfig();
      if (!config.algoliaApplicationId || !config.algoliaAdminApiKey) {
        throw createError({ statusCode: 500, message: 'Algolia credentials missing for search' });
      }
      
      const algoliasearch = await import('algoliasearch').then((m) => m.default || m);
      const client = algoliasearch(config.algoliaApplicationId, config.algoliaAdminApiKey);
      const index = client.initIndex('search_history');
      
      // Page is 0-indexed in Algolia. 
      // If cursor is passed as a page number in search mode, we'd need to handle it.
      // But the frontend is passing `cursor` as a timestamp now. 
      // To keep it simple, if searchTerm is active, we just use the cursor as a page number (stringified integer)
      const algoliaPage = query.cursor ? parseInt(String(query.cursor), 10) : 0;
      
      const { hits, nbHits, page: resultPage, nbPages } = await index.search(searchTerm, {
        page: algoliaPage,
        hitsPerPage: limitCount
      });
      
      logsRaw = hits.map((hit: any) => ({
        ...hit,
        id: hit.objectID,
        // Algolia stores dates as timestamps or strings, reconstruct it for the frontend
        timestamp: hit.timestamp ? { toDate: () => new Date(hit.timestamp) } : null
      }));
      
      displayTotalCount = nbHits;
      if (resultPage + 1 < nbPages) {
        nextCursor = String(resultPage + 1);
      }
    } else {
      // Native Pagination with Cursors
      let logsQuery = collectionRef.orderBy('timestamp', 'desc');
      
      if (query.cursor) {
        const cursorDoc = await collectionRef.doc(String(query.cursor)).get();
        if (cursorDoc.exists) {
          logsQuery = logsQuery.startAfter(cursorDoc);
        }
      }
      
      const latestSnapshot = await logsQuery.limit(limitCount).get();
      logsRaw = latestSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      if (latestSnapshot.docs.length === limitCount) {
        nextCursor = latestSnapshot.docs[latestSnapshot.docs.length - 1].id;
      }
    }

    const todayCount = todaySnapshot.data()?.count || 0;
    const yesterdayCount = yesterdaySnapshot.data()?.count || 0;

    let oldestDate = 'the beginning';
    let averagePerDay = 0;

    if (!oldestSnapshot.empty && oldestSnapshot.docs[0]) {
      const oldestData = oldestSnapshot.docs[0].data();
      if (oldestData.timestamp) {
        oldestDate = oldestData.timestamp.toDate().toLocaleDateString('en-GB', {
          month: 'short',
          year: 'numeric'
        });

        const nowMs = Date.now();
        const oldestMs = oldestData.timestamp.toMillis();
        const diffMs = nowMs - oldestMs;

        const daysElapsed = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        averagePerDay = Math.round(countSnapshot.data().count / daysElapsed);
      }
    }

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
        dateKey: dateObj ? dateObj.toLocaleDateString('en-GB') : 'Unknown',
        mcaScore: data.mcaScore || null,
        marketAverage: data.marketAverage || null,
        governmentAverage: data.governmentAverage || null,
        searchSuccess: data.searchSuccess ?? null,
        historicalFetchedMCA: data.historical_fetched_MCA ?? null,
        provider: data.provider || null
      };
    });

    return {
      success: true,
      totalCount: displayTotalCount,
      todayCount,
      yesterdayCount,
      oldestDate,
      averagePerDay,
      logs,
      nextCursor
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: (error as Error)?.message || 'Failed to fetch search history'
    });
  }
});
