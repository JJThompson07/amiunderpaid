export default defineEventHandler(async (event) => {
  await verifyAdmin(event);

  const db = useAdminFirestore();
  const now = new Date();

  let deletedJobs = 0;
  let deletedDistributions = 0;

  // Helper function to delete documents in batches to avoid Firestore limits
  const deleteInBatches = async (query: any) => {
    let deletedCount = 0;

    // Process in chunks of 500 (Firestore batch limit)
    let snapshot = await query.limit(500).get();

    while (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach((doc: any) => batch.delete(doc.ref));

      await batch.commit();
      deletedCount += snapshot.size;

      // Fetch the next batch
      snapshot = await query.limit(500).get();
    }

    return deletedCount;
  };

  try {
    // --- 1. CLEAN JOBS CACHE ---
    // Much more memory efficient! Let the database do the filtering.
    const expiredJobsQuery = db.collection('adzuna_jobs_cache').where('expiresAt', '<', now);

    deletedJobs = await deleteInBatches(expiredJobsQuery);

    // --- 2. CLEAN DISTRIBUTION CACHE ---
    const expiredDistQuery = db
      .collection('adzuna_distribution_cache')
      .where('expiresAt', '<', now);

    deletedDistributions = await deleteInBatches(expiredDistQuery);

    return {
      success: true,
      message: 'Cache cleaned successfully.',
      stats: {
        deletedJobs,
        deletedDistributions
      }
    };
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to clean cache',
      data: e.message
    });
  }
});
