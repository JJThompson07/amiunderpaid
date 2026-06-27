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

    // Notify the applicant of the rejection outcome
    await db.collection('mail').add({
      to: data.email,
      message: {
        subject: 'Update on your partner access application',
        html: `
          <h2>An update on your application</h2>
          <p>Hi ${data.agency_name || 'there'},</p>
          <p>Thank you for your interest in becoming a partner on our platform.</p>
          <p>After reviewing your application, we are unfortunately unable to approve your request at this time.</p>
          <p>If you believe this was a mistake or would like to discuss further, please don't hesitate to get in touch with our team.</p>
          <br/>
          <p>Best regards,<br/>The Platform Team</p>
        `,
        text: `Hi ${data.agency_name || 'there'},\n\nThank you for your interest in becoming a partner on our platform.\n\nAfter reviewing your application, we are unfortunately unable to approve your request at this time.\n\nIf you believe this was a mistake or would like to discuss further, please don't hesitate to get in touch with our team.\n\nBest regards,\nThe Platform Team`
      }
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
