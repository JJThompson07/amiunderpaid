import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { generateCacheKey } from '../../utils/adzuna';
import { calculateUKBenchmarkScore } from '../../../shared/utils/uk';
import { calculateUSABenchmarkScore } from '../../../shared/utils/usa';

export default defineEventHandler(async (event) => {
  const authHeader = getRequestHeader(event, 'authorization');
  if (!authHeader?.startsWith('Bearer ')) return createError({ statusCode: 401 });
  const token = authHeader.split('Bearer ')[1]!;
  await getAuth().verifyIdToken(token);

  const db = getFirestore();

  try {
    // Since we cannot query for missing fields in Firestore, and limit(50) only checks the newest,
    // we need to scan backwards through time and find up to 50 docs that need processing.
    const snapshotMissing = await db
      .collection('search_history')
      .orderBy('timestamp', 'desc')
      .limit(1000)
      .get();

    const allDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    let foundCount = 0;

    for (const doc of snapshotMissing.docs) {
      if (foundCount >= 50) break;
      const data = doc.data();
      const needsV2 = !data.historical_fetched_MCA_v2;
      if (
        needsV2 &&
        (data.mcaScore === undefined ||
          data.mcaScore === null ||
          data.governmentAverage === undefined ||
          data.governmentAverage === null)
      ) {
        allDocs.set(doc.id, doc);
        foundCount++;
      }
    }

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const skipReasons = {
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
        const histCacheDoc = await db
          .collection('adzuna_distribution_cache')
          .doc(baseCacheKey)
          .get();
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
            marketAverage =
              results.reduce((acc: number, curr: any) => acc + (curr.salary_max || 0), 0) /
              results.length;
          }
        }

        let microData = null;
        let formattedMicroData = null;
        const queryCountry = countryCode === 'us' ? 'USA' : 'UK';

        let microSnap: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData> | null =
          null;

        if (govIdCode) {
          microSnap = await db
            .collection('salary_benchmarks')
            .where('id_code', '==', govIdCode)
            .where('country', '==', queryCountry)
            .limit(1)
            .get();
        } else {
          // Fallback to text match in Firestore
          const cleanTitle = title.toLowerCase().trim().replace(/"/g, '\\"');

          if (queryCountry === 'UK') {
            // UK uses SOC codes mapped in job_titles
            const jobTitleSnap = await db
              .collection('job_titles')
              .where('searchTitle', '==', cleanTitle)
              .where('country', '==', 'UK')
              .limit(1)
              .get();

            if (!jobTitleSnap.empty) {
              const soc = jobTitleSnap.docs[0]?.data()?.soc;
              if (soc) {
                microSnap = await db
                  .collection('salary_benchmarks')
                  .where('id_code', '==', soc)
                  .where('country', '==', 'UK')
                  .limit(1)
                  .get();
              }
            }
          } else {
            // US uses direct title match in salary_benchmarks
            microSnap = await db
              .collection('salary_benchmarks')
              .where('searchTitle', '==', cleanTitle)
              .where('country', '==', 'USA')
              .limit(1)
              .get();
          }
        }

        if (microSnap && !microSnap.empty) {
          microData = microSnap.docs[0]?.data();
          if (microData) {
            formattedMicroData = {
              mean: microData.avg_salary || microData.salary || 0,
              p10: microData.salary_10_pt || null,
              p25: microData.salary_25_pt || null,
              p50: microData.salary || 0,
              p75: microData.salary_75_pt || null,
              p90: microData.salary_90_pt || null
            };
          }
        }

        let macroData = null;
        if (countryCode === 'us') {
          const usMacroSnap = await db
            .collection('salary_benchmarks')
            .where('id_code', '==', '00-0000')
            .where('country', '==', 'USA')
            .limit(1)
            .get();
          if (!usMacroSnap.empty) {
            const hit = usMacroSnap.docs[0]?.data();
            if (hit) {
              macroData = {
                macroNationalData: {
                  mean: hit.avg_salary || hit.salary || 0,
                  p10: hit.salary_10_pt || null,
                  p25: hit.salary_25_pt || null,
                  p50: hit.salary || 0,
                  p75: hit.salary_75_pt || null,
                  p90: hit.salary_90_pt || null
                },
                nationalMedianAllRoles: hit.salary || 0,
                regionalMedianAllRoles: hit.salary || 0
              };
            }
          }
        } else {
          const ukMacroSnap = await db
            .collection('salary_benchmarks')
            .where('searchTitle', '==', 'all employees')
            .where('country', '==', 'UK')
            .where('searchLocation', 'in', ['uk', 'united kingdom'])
            .limit(1)
            .get();
          if (!ukMacroSnap.empty) {
            const hit = ukMacroSnap.docs[0]?.data();
            if (hit) {
              macroData = {
                macroNationalData: {
                  mean: hit.avg_salary || hit.salary || 0,
                  p10: hit.salary_10_pt || null,
                  p25: hit.salary_25_pt || null,
                  p50: hit.salary || 0,
                  p75: hit.salary_75_pt || null,
                  p90: hit.salary_90_pt || null
                },
                nationalMedianAllRoles: hit.salary || 0,
                regionalMedianAllRoles: hit.salary || 0
              };
            }
          }
        }

        let governmentAverage: number | null = null;
        if (microData) {
          governmentAverage = microData.avg_salary || microData.salary || null;
        }

        let mcaScore: number | null = null;
        let microPercentile: number | null = null;
        let macroPercentile: number | null = null;
        let livePercentile: number | null = null;

        // Calculate Real Score
        if (macroData && userSalary > 0) {
          const hasMicro = !!formattedMicroData;
          const hasLive = jobsCount > 0;

          if (hasMicro || hasLive) {
            if (countryCode === 'gb') {
              const res = calculateUKBenchmarkScore(
                userSalary,
                macroData.macroNationalData,
                formattedMicroData,
                microData?.title || '',
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
                formattedMicroData,
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
          historical_fetched_MCA_v2: true
        };

        if (marketAverage !== null || governmentAverage !== null) {
          updatePayload.searchSuccess = true;
        }

        updatePayload.mcaScore = mcaScore;
        updatePayload.marketAverage = marketAverage;
        updatePayload.governmentAverage = governmentAverage;

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
