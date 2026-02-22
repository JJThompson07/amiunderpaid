import { verifyAdmin, useAdminFirestore } from '~~/server/utils/firebase';

export default defineEventHandler(async (event) => {
  await verifyAdmin(event);

  const db = useAdminFirestore();
  const now = Date.now();

  let deletedJobs = 0;
  let deletedDistributions = 0;

  const deleteInBatches = async (refs: any[]) => {
    for (let i = 0; i < refs.length; i += 500) {
      const chunk = refs.slice(i, i + 500);
      const batch = db.batch();
      chunk.forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
  };

  try {
    // ----------------------------------------------------------------------
    // OPTIMIZATION: Fetch all categories ONCE upfront to prevent N+1 queries
    // ----------------------------------------------------------------------
    const categorySnap = await db.collection('adzuna_category').get();
    const categoryCacheMap: Record<string, number> = {};

    categorySnap.forEach((doc) => {
      const data = doc.data();
      const cacheDays = Number(data?.cache || 120);
      // Store the expiration time in milliseconds for instant lookup later
      categoryCacheMap[doc.id] = cacheDays * 24 * 60 * 60 * 1000;
    });

    // Helper to get cache time securely, defaulting to 120 days if not found
    const getCacheTimeMilli = (tag: string) => categoryCacheMap[tag] || 120 * 24 * 60 * 60 * 1000;

    // --- 1. CLEAN JOBS CACHE ---
    const jobsSnapshot = await db.collection('adzuna_jobs_cache').get();
    const jobsToDelete: any[] = [];

    // Notice we use a standard synchronous loop now!
    for (const doc of jobsSnapshot.docs) {
      const docData = doc.data();
      const cachedTime = docData.timestamp?.toMillis() || 0;
      const ageInMs = now - cachedTime;

      const categoryTag =
        docData.categoryTag || docData.data?.categoryTag || docData.searchParams?.categoryTag || '';

      // Look up the time instantly from our pre-fetched map
      const categoryCacheMilli = getCacheTimeMilli(categoryTag);
      const isExpired = ageInMs >= categoryCacheMilli;
      const hasCategoryTag = !!categoryTag;

      if (isExpired || !hasCategoryTag) {
        jobsToDelete.push(doc.ref);
      }
    }

    if (jobsToDelete.length > 0) {
      await deleteInBatches(jobsToDelete);
      deletedJobs = jobsToDelete.length;
    }

    // --- 2. CLEAN DISTRIBUTION CACHE ---
    const distSnapshot = await db.collection('adzuna_distribution_cache').get();
    const distToDelete: any[] = [];

    for (const doc of distSnapshot.docs) {
      const docData = doc.data();
      const cachedTime = docData.timestamp?.toMillis() || 0;
      const ageInMs = now - cachedTime;

      const categoryTag =
        docData.categoryTag || docData.data?.categoryTag || docData.searchParams?.categoryTag || '';

      const categoryCacheMilli = getCacheTimeMilli(categoryTag);
      const isExpired = ageInMs >= categoryCacheMilli;
      const hasCategoryTag = !!categoryTag;

      if (isExpired || !hasCategoryTag) {
        distToDelete.push(doc.ref);
      }
    }

    if (distToDelete.length > 0) {
      await deleteInBatches(distToDelete);
      deletedDistributions = distToDelete.length;
    }

    return {
      success: true,
      message: `Cache cleaned successfully.`,
      stats: {
        deletedJobs,
        deletedDistributions
      }
    };
  } catch (e: any) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to clean cache', data: e.message });
  }
});
