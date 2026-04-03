export default defineEventHandler(async (event) => {
  await verifyAdmin(event);

  const query = getQuery(event);
  const suggestionId = query.suggestionId as string;

  if (!suggestionId) {
    throw createError({ statusCode: 400, statusMessage: 'Suggestion ID is required' });
  }

  const db = useAdminFirestore();

  try {
    // 👇 Updated to target the new 'job_suggestions' collection
    await db.collection('job_suggestions').doc(suggestionId).delete();

    return { success: true, message: 'Suggestion rejected and deleted.' };
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete suggestion',
      data: e.message
    });
  }
});
