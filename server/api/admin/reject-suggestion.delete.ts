export default defineEventHandler(async (event) => {
  await verifyAdmin(event);

  const query = getQuery(event);
  const suggestionId = query.id as string;

  if (!suggestionId) {
    throw createError({ statusCode: 400, statusMessage: 'Suggestion ID is required' });
  }

  const db = useAdminFirestore();

  try {
    await db.collection('user_match_suggestions').doc(suggestionId).delete();
    return { success: true, message: 'Suggestion rejected and deleted.' };
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete suggestion',
      data: e.message
    });
  }
});
