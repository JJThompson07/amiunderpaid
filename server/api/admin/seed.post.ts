export default defineEventHandler(async (event) => {
  await verifyAdmin(event);

  const body = await readBody(event);
  const { collectionName, data } = body;

  // Security Remediation: Prevent arbitrary collection targeting by using an allow-list
  const ALLOWED_COLLECTIONS = ['adzuna_categories', 'job_titles', 'platform_settings', 'uk_job_groups', 'usa_job_groups'];
  if (!ALLOWED_COLLECTIONS.includes(collectionName)) {
    throw createError({ statusCode: 400, message: 'Invalid seed target' });
  }

  const count = await batchSeed(collectionName, data);
  return { success: true, count };
});
