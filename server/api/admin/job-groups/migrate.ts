// server/api/admin/job-groups/migrate.post.ts
import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const country = body.country === 'USA' ? 'USA' : 'UK';
  const db = getFirestore();

  const targetCollection = country === 'USA' ? 'usa_job_groups' : 'uk_job_groups';
  const benchmarkCountryCode = country === 'USA' ? 'USA' : 'UK';

  try {
    // ==========================================
    // STEP 1: Get the baseline groups from salary_benchmarks
    // ==========================================
    const benchmarksSnapshot = await db
      .collection('salary_benchmarks')
      .where('country', '==', benchmarkCountryCode)
      .get();

    if (benchmarksSnapshot.empty) {
      return { success: false, message: `No benchmarks found for ${country}.` };
    }

    const groupedData: Record<string, { group_name: string; titles: Set<string> }> = {};

    benchmarksSnapshot.docs.forEach((doc) => {
      const data = doc.data(); // Matches SalaryRecord interface
      const idCode = data.id_code;
      const groupName = data.title || 'Unknown Group'; // The 'title' acts as the Group Name

      if (!idCode) return;

      // Because benchmarks have multiple locations, we only need to initialize the group once!
      if (!groupedData[idCode]) {
        groupedData[idCode] = {
          group_name: groupName,
          titles: new Set<string>()
        };
      }
    });

    // ==========================================
    // STEP 2: If UK, fetch job_titles to populate synonyms
    // ==========================================
    if (country === 'UK') {
      const titlesSnapshot = await db.collection('job_titles').get();

      titlesSnapshot.docs.forEach((doc) => {
        const data = doc.data(); // Matches JobTitleRecord interface
        const idCode = data.soc; // UK Synonyms use 'soc' instead of 'id_code'!
        const title = (data.title || '').toLowerCase().trim();

        if (!idCode || !title) return;

        // If this SOC code exists in our benchmarks, add the title to the Set!
        if (groupedData[idCode]) {
          groupedData[idCode].titles.add(title);
        }
      });
    }

    // ==========================================
    // STEP 3: Batch Write to the new Master Dictionary
    // ==========================================
    // 1. Change 'const' to 'let' so we can overwrite it!
    let batch = db.batch();
    const newCollectionRef = db.collection(targetCollection);

    let totalCount = 0;
    let currentBatchCount = 0; // 2. Add a tracker just for the active batch

    for (const [idCode, groupData] of Object.entries(groupedData)) {
      const docRef = newCollectionRef.doc(idCode);
      batch.set(
        docRef,
        {
          group_name: groupData.group_name,
          titles: Array.from(groupData.titles)
        },
        { merge: true }
      );

      totalCount++;
      currentBatchCount++;

      // 3. When the active batch hits 450, commit it and create a NEW one
      if (currentBatchCount === 450) {
        await batch.commit();
        batch = db.batch(); // 👈 THIS IS THE MAGIC FIX
        currentBatchCount = 0; // Reset the counter for the new batch
      }
    }

    // 4. Commit any remaining documents in the final batch
    if (currentBatchCount > 0) {
      await batch.commit();
    }

    return {
      success: true,
      message: `Successfully migrated ${totalCount} base groups into ${targetCollection}!`
    };
  } catch (error) {
    console.error(`Migration failed for ${country}:`, error);
    throw createError({ statusCode: 500, message: 'Migration failed' });
  }
});
