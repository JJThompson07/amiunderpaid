import { generateCacheKey } from '~~/server/utils/adzuna';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { title, location, country, gov_id_code, limit } = body;

  if (!title || !gov_id_code) {
    throw createError({ statusCode: 400, statusMessage: 'Title and gov_id_code are required' });
  }

  // 1. Strict Sanitization Helpers
  // Removes HTML tags (< >) to prevent basic XSS if this data is ever rendered
  const sanitizeText = (str: any) =>
    String(str || '')
      .replace(/[<>]/g, '')
      .trim();

  // Gov IDs/SOC codes should generally just be alphanumeric (and maybe dashes)
  // This strips out absolutely everything else.
  const sanitizedGovId = String(gov_id_code)
    .replace(/[^a-zA-Z0-9-]/g, '')
    .trim();

  if (!sanitizedGovId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid gov_id_code format' });
  }

  // 2. Apply Sanitization
  const titleStr = sanitizeText(title);
  const countryCode = sanitizeText(country || 'gb').toLowerCase();
  const locationStr = sanitizeText(location);

  // Ensure limit is actually a number, and bound it between 1 and 50
  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 50);

  const db = useAdminFirestore();

  // Ensure we match the exact cache key structure from jobs.ts
  const cacheKey = `${generateCacheKey(titleStr, locationStr, countryCode)}-${safeLimit}`;
  const cacheRef = db.collection('adzuna_jobs_cache').doc(cacheKey);

  try {
    // Merge: true ensures we add gov_id_code without overwriting the Adzuna job data
    await cacheRef.set(
      {
        gov_id_code: sanitizedGovId,
        is_user_verified: true, // Flag to indicate if it was manually corrected
        updatedAt: new Date()
      },
      { merge: true }
    );

    return { success: true, message: 'Jobs cache updated with safely sanitized government match.' };
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update jobs cache with government match.',
      data: e
    });
  }
});
