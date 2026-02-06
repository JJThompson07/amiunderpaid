import { defineEventHandler, readBody, createError } from 'h3';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body) throw createError({ statusCode: 400, message: 'No body provided' });

  const { data } = body;

  if (!data || !Array.isArray(data)) {
    throw createError({ statusCode: 400, message: 'Invalid data format' });
  }

  // Initialize Firebase Admin if not already initialized
  if (getApps().length === 0) {
    initializeApp();
  }

  const db = getFirestore();
  const collectionName = 'regional_salary_benchmarks';
  const batchSize = 400; // Firestore batch limit is 500, keeping it safe
  let savedCount = 0;

  // Process in chunks to respect Firestore batch limits
  for (let i = 0; i < data.length; i += batchSize) {
    const chunk = data.slice(i, i + batchSize);
    const batch = db.batch();

    chunk.forEach((record: any) => {
      // Create a deterministic ID to avoid duplicates
      // ID format: country-location-title-year-period (sanitized & lowercase to match seed.vue)
      const cleanTitle = record.title
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_\-+#.]/g, '');
      const cleanLocation = record.location
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_\-+.#]/g, '');
      
      const docId = `${record.country}-${cleanLocation}-${cleanTitle}-${record.year}-${record.period || 'year'}`.toLowerCase();
      
      const docRef = db.collection(collectionName).doc(docId);
      
      // Generate keywords for search
      const keywords = record.title
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((k: string) => k.length > 1);

      batch.set(docRef, {
        ...record,
        searchTitle: record.title.toLowerCase(),
        searchLocation: record.location.toLowerCase(),
        keywords,
        updatedAt: new Date()
      }, { merge: true });
    });

    await batch.commit();
    savedCount += chunk.length;
  }

  return {
    success: true,
    savedCount,
    message: `Successfully saved ${savedCount} records to ${collectionName}`
  };
});