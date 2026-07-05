// server/api/admin/backfill-searches.post.ts
import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const db = getFirestore();

  try {
    // 1. Fetch all search_history docs that have NOT been enriched yet
    const snapshot = await db
      .collection('search_history')
      .where('mcaScore', '==', null)
      .limit(200)
      .get();

    // Also fetch docs where mcaScore field doesn't exist at all
    const snapshotMissing = await db
      .collection('search_history')
      .orderBy('timestamp', 'desc')
      .limit(500)
      .get();

    // Merge: only process docs that genuinely lack mcaScore
    const allDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    snapshot.docs.forEach((doc) => allDocs.set(doc.id, doc));
    snapshotMissing.docs.forEach((doc) => {
      const data = doc.data();
      if (data.mcaScore === undefined && data.mcaScore !== null && !data.historical_fetched_MCA) {
        allDocs.set(doc.id, doc);
      }
    });

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const [docId, doc] of allDocs) {
      const data = doc.data();

      // Skip if already backfilled
      if (data.historical_fetched_MCA === true) {
        skipped++;
        continue;
      }

      // Skip if already has mcaScore populated (from live enrichment)
      if (data.mcaScore && data.mcaScore !== null) {
        skipped++;
        continue;
      }

      const title = data.title || '';
      const country = data.country || 'UK';
      const location = data.location || '';
      const userSalary = data.salary || 0;

      if (!title || !userSalary) {
        skipped++;
        continue;
      }

      try {
        // 2. Look up cached Adzuna data
        const countryCode = country === 'USA' || country === 'US' ? 'us' : 'gb';
        const cacheKey = generateCacheKey(title, location, countryCode);
        const cacheDoc = await db.collection('adzuna_distribution_cache').doc(cacheKey).get();

        let marketAverage: number | null = null;

        if (cacheDoc.exists) {
          const cacheData = cacheDoc.data();
          marketAverage = cacheData?.data?.mean || null;
        }

        // 3. Calculate a simple MCA verdict based on available data
        let mcaScore: string | null = null;

        if (marketAverage && userSalary) {
          const diffPercent = ((userSalary - marketAverage) / marketAverage) * 100;

          if (diffPercent >= 15) {
            mcaScore = 'Market Leader';
          } else if (diffPercent >= 0) {
            mcaScore = 'Strong';
          } else if (diffPercent >= -10) {
            mcaScore = 'Fair';
          } else {
            mcaScore = 'Review';
          }
        }

        // 4. Write the enriched data back to the search history document
        const updatePayload: Record<string, any> = {
          historical_fetched_MCA: true,
          searchSuccess: marketAverage !== null
        };

        if (mcaScore) updatePayload.mcaScore = mcaScore;
        if (marketAverage) updatePayload.marketAverage = marketAverage;

        await db.collection('search_history').doc(docId).update(updatePayload);
        updated++;
      } catch {
        failed++;
      }
    }

    return {
      success: true,
      processed: allDocs.size,
      updated,
      skipped,
      failed
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: (error as Error)?.message || 'Backfill failed'
    });
  }
});
