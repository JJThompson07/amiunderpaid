import { getFirestore } from 'firebase-admin/firestore';
import { generateCacheKey } from '../../utils/adzuna';

export default defineEventHandler(async (_event) => {
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
      if (data.mcaScore === undefined && data.mcaScore !== null && (!data.historical_fetched_MCA || data.marketAverage == null)) {
        allDocs.set(doc.id, doc);
      }
    });

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const skipReasons: Record<string, number> = {
      alreadyBackfilled: 0,
      hasMcaScore: 0,
      missingTitle: 0
    };
    const failReasons: string[] = [];

    for (const [docId, doc] of allDocs) {
      const data = doc.data();

      // Skip if already backfilled successfully
      if (data.historical_fetched_MCA === true && data.marketAverage != null) {
        skipped++;
        skipReasons.alreadyBackfilled++;
        continue;
      }

      // Skip if already has mcaScore populated (from live enrichment)
      if (data.mcaScore !== undefined && data.mcaScore !== null) {
        skipped++;
        skipReasons.hasMcaScore++;
        continue;
      }

      const title = data.title || '';
      const country = data.country || 'UK';
      const location = data.location || '';
      const userSalary = data.salary || 0;

      if (!title) {
        skipped++;
        skipReasons.missingTitle++;
        continue;
      }

      try {
        const countryCode = country === 'USA' || country === 'US' ? 'us' : 'gb';
        
        let locationStr = location.toLowerCase().trim();
        const countryAliases =
          countryCode === 'us'
            ? ['us', 'usa', 'united states', 'america']
            : ['uk', 'gb', 'united kingdom', 'britain'];

        if (countryAliases.includes(locationStr)) {
          locationStr = '';
        }

        const baseCacheKey = generateCacheKey(title, locationStr, countryCode);
        
        // Fetch Histogram Cache
        const histCacheDoc = await db.collection('adzuna_distribution_cache').doc(baseCacheKey).get();
        const histData = histCacheDoc.exists ? histCacheDoc.data()?.data?.histogram || {} : {};

        // Fetch Jobs Cache (default 5 results)
        const jobType = data.schedule === 'part-time' ? 'part-time' : 'full-time';
        const contractType = data.contract === 'contract' ? 'contract' : 'permanent';
        const jobsCacheKey = `${baseCacheKey}-${jobType}-${contractType}-10`;
        const jobsCacheDoc = await db.collection('adzuna_jobs_cache').doc(jobsCacheKey).get();
        
        let marketAverage: number | null = null;
        let jobsCount = 0;
        let govIdCode: string | null = null;

        if (jobsCacheDoc.exists) {
          const jData = jobsCacheDoc.data();
          const results = jData?.data?.results || [];
          jobsCount = jData?.data?.count || 0;
          govIdCode = jData?.gov_id_code || null;
          
          if (results.length > 0) {
            marketAverage = results.reduce((acc: number, curr: any) => acc + (curr.salary_max || 0), 0) / results.length;
          }
        }

        // Fetch Government Data
        let microData = null;
        if (govIdCode) {
          const microSnap = await db.collection('adzuna_category').doc(govIdCode).get();
          if (microSnap.exists) microData = microSnap.data();
        }

        const macroCol = countryCode === 'us' ? 'usa_national_baseline' : 'national_baseline';
        const macroSnap = await db.collection(macroCol).doc('latest').get();
        const macroData = macroSnap.exists ? macroSnap.data() : null;

        let governmentAverage: number | null = null;
        if (microData) {
          governmentAverage = microData.microNationalData?.mean || microData.microNationalData?.p50 || null;
        }

        let mcaScore: number | null = null;
        let microPercentile: number | null = null;
        let macroPercentile: number | null = null;
        let livePercentile: number | null = null;

        // Calculate Real Score
        if (macroData && userSalary > 0) {
          const hasMicro = !!microData?.microNationalData;
          const hasLive = jobsCount > 0;

          if (hasMicro || hasLive) {
            if (countryCode === 'gb') {
              const res = calculateUKBenchmarkScore(
                userSalary,
                macroData.macroNationalData,
                microData?.microNationalData || null,
                microData?.officialGroupTitle || '',
                null,
                macroData.regionalMedianAllRoles,
                macroData.nationalMedianAllRoles,
                histData,
                jobsCount,
                marketAverage || 0
              );
              mcaScore = res.score;
              microPercentile = res.breakdown.microPercentile;
              macroPercentile = res.breakdown.macroPercentile;
              livePercentile = res.breakdown.livePercentile;
            } else {
              const res = calculateUSABenchmarkScore(
                userSalary,
                macroData.macroNationalData,
                null, // regional macro
                microData?.microNationalData || null,
                null, // regional micro
                macroData.regionalMedianAllRoles,
                macroData.nationalMedianAllRoles,
                histData,
                jobsCount,
                marketAverage || 0
              );
              mcaScore = res.score;
              microPercentile = res.breakdown.microPercentile;
              macroPercentile = res.breakdown.macroPercentile;
              livePercentile = res.breakdown.livePercentile;
            }
          }
        }

        const updatePayload: Record<string, any> = {
          historical_fetched_MCA: true,
        };

        if (marketAverage !== null || governmentAverage !== null) {
          updatePayload.searchSuccess = true;
        }

        if (mcaScore !== null) updatePayload.mcaScore = mcaScore;
        if (marketAverage !== null) updatePayload.marketAverage = marketAverage;
        if (governmentAverage !== null) updatePayload.governmentAverage = governmentAverage;
        if (microPercentile !== null) updatePayload.microPercentile = microPercentile;
        if (macroPercentile !== null) updatePayload.macroPercentile = macroPercentile;
        if (livePercentile !== null) updatePayload.livePercentile = livePercentile;

        await db.collection('search_history').doc(docId).set(updatePayload, { merge: true });
        updated++;
      } catch (err: any) {
        failed++;
        failReasons.push(err.message || 'Unknown error');
      }
    }

    return {
      success: true,
      processed: allDocs.size,
      updated,
      skipped,
      failed,
      skipReasons,
      failReasons
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: (error as Error)?.message || 'Backfill failed'
    });
  }
});
