export default defineEventHandler(async (event) => {
  // Security: Only admins can read this
  await verifyAdmin(event);

  const db = useAdminFirestore();

  try {
    // Fetch suggestions, newest first
    const snapshot = await db
      .collection('user_match_suggestions')
      .orderBy('timestamp', 'desc')
      .get();

    const suggestions = snapshot.docs.map((doc) => {
      const data = doc.data();

      // Explicitly map the properties so TypeScript knows the exact shape
      return {
        id: doc.id,
        title: String(data.title || ''),
        location: String(data.location || ''),
        country: String(data.country || ''),
        suggested_gov_id: String(data.suggested_gov_id || ''),
        suggested_gov_title: String(data.suggested_gov_title || 'Unknown Role'),
        is_automatic_system_save: Boolean(data.is_automatic_system_save),

        // FORCE this to be a string so Nitro's SerializeObject doesn't strip it!
        timestamp: String(
          data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : 'Unknown Date'
        )
      };
    });

    return { success: true, suggestions };
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch suggestions',
      data: e.message
    });
  }
});
