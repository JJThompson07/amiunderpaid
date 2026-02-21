import { generateCacheKey } from '~~/server/utils/adzuna';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { title, location, country, gov_id_code, limit = 5 } = body;

  if (!title || !gov_id_code) {
    throw createError({ statusCode: 400, statusMessage: 'Title and gov_id_code are required' });
  }

  const titleStr = String(title);
  const countryCode = String(country || 'gb').toLowerCase();
  const locationStr = location ? String(location) : '';

  const db = useAdminFirestore();

  // Ensure we match the exact cache key structure from jobs.ts
  const cacheKey = `${generateCacheKey(titleStr, locationStr, countryCode)}-${limit}`;
  const cacheRef = db.collection('adzuna_jobs_cache').doc(cacheKey);

  try {
    // Merge: true ensures we add gov_id_code without overwriting the Adzuna job data
    await cacheRef.set(
      {
        gov_id_code: String(gov_id_code),
        is_user_verified: true, // Flag to indicate if it was manually corrected
        updatedAt: new Date()
      },
      { merge: true }
    );

    return { success: true, message: 'Jobs cache updated with government match.' };
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update jobs cache with government match.',
      data: e
    });
  }
});
