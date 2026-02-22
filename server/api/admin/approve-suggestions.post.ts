export default defineEventHandler(async (event) => {
  // Security check
  await verifyAdmin(event);

  const body = await readBody(event);
  const { suggestionId, title, location, country, gov_id_code, limit = 5 } = body;

  if (!suggestionId || !title || !gov_id_code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields to approve suggestion.'
    });
  }

  const db = useAdminFirestore();

  try {
    // 1. Re-generate the exact cache key that this job title uses
    const titleStr = String(title);
    const countryCode = String(country || 'gb').toLowerCase();
    const locationStr = location ? String(location) : '';

    const cacheKey = `${generateCacheKey(titleStr, locationStr, countryCode)}-${limit}`;
    const cacheRef = db.collection('adzuna_jobs_cache').doc(cacheKey);

    // 2. Write the approved ID to the live cache
    await cacheRef.set(
      {
        gov_id_code: String(gov_id_code),
        is_admin_verified: true, // Flag it as officially verified by you
        updatedAt: new Date()
      },
      { merge: true } // Merge ensures we don't accidentally overwrite the job listing data
    );

    // 3. Delete the suggestion from the queue so it doesn't show up in your dashboard anymore
    await db.collection('user_match_suggestions').doc(suggestionId).delete();

    return { success: true, message: 'Suggestion approved and applied to live cache!' };
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to approve suggestion',
      data: e.message
    });
  }
});
