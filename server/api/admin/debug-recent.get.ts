import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const db = getFirestore();
  const snap = await db.collection('search_history').orderBy('timestamp', 'desc').limit(5).get();
  const doc1 = await db.collection('adzuna_jobs_cache').doc('gb--senior-frontend-developer-full-time-permanent-10').get();
  const doc2 = await db.collection('adzuna_distribution_cache').doc('gb--senior-frontend-developer').get();
  const doc3 = await db.collection('adzuna_category').doc('2134').get();

  return {
    catExists: doc3.exists,
    catData: doc3.exists ? doc3.data() : null,
    jobsCacheExists: doc1.exists,
    jobsCacheData: doc1.exists ? doc1.data() : null,
    distCacheExists: doc2.exists,
    distCacheData: doc2.exists ? doc2.data() : null,
    recentSearches: snap.docs.map(d => ({ id: d.id, ...d.data() }))
  };
});
