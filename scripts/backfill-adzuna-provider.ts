import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

// Initialize Firebase Admin
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function backfillCollection(collectionName: string) {
  console.log(`Starting backfill for ${collectionName}...`);
  const snapshot = await db.collection(collectionName).get();
  let count = 0;

  const batchSize = 500;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const docData = doc.data();
    
    // Check if data.provider exists
    if (docData.data && !docData.data.provider) {
      const updatedData = {
        ...docData.data,
        provider: 'adzuna'
      };

      batch.update(doc.ref, { data: updatedData });
      batchCount++;
      count++;

      if (batchCount >= batchSize) {
        await batch.commit();
        console.log(`Committed batch of ${batchSize} for ${collectionName}`);
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${batchCount} for ${collectionName}`);
  }

  console.log(`Finished backfill for ${collectionName}. Updated ${count} documents.`);
}

async function main() {
  try {
    await backfillCollection('adzuna_distribution_cache');
    await backfillCollection('adzuna_jobs_cache');
    console.log('Backfill completed successfully.');
  } catch (error) {
    console.error('Error during backfill:', error);
  }
}

main();
