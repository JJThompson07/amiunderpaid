const ALLOWED_COLLECTIONS = ['adzuna_jobs_cache', 'reed_jobs_cache'];

export default defineEventHandler(async (event) => {
  // admin-guard.ts now handles authentication globally for /api/admin/*, but we can leave this or remove it.
  // We'll leave it for explicit defense-in-depth, or rely on middleware. Let's rely on middleware since it's an overarching rule.
  // Actually, we can keep verifyAdmin(event) just to be safe.
  await verifyAdmin(event);

  const body = await readBody(event);
  const { collectionName, filters } = body;

  if (!collectionName || !ALLOWED_COLLECTIONS.includes(collectionName)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or restricted collection name'
    });
  }

  if (!filters || Object.keys(filters).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Filters are required to prevent full collection wipe'
    });
  }

  const count = await batchDelete(collectionName, filters);
  return { success: true, count };
});
