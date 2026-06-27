export default defineEventHandler(async (event) => {
  await verifyAdmin(event);

  const body = await readBody(event);
  const { uid } = body;

  if (!uid) {
    throw createError({ statusCode: 400, message: 'Missing UID' });
  }

  const db = useAdminFirestore();

  try {
    const docRef = db.collection('users').doc(uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw createError({ statusCode: 404, message: 'Recruiter not found.' });
    }

    const data = docSnap.data() || {};
    if (data.status !== 'requested') {
      throw createError({
        statusCode: 400,
        message: `Cannot reject request in status: ${data.status || 'unknown'}`
      });
    }

    // Update the Firestore user document status to 'rejected'
    await docRef.update({
      status: 'rejected',
      updatedAt: new Date().toISOString()
    });

    return { success: true };
  } catch (error: any) {
    console.error('🔥 Error rejecting recruiter:', error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to reject recruiter.'
    });
  }
});
