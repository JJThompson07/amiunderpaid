import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { agencyName, email } = body;

  if (!agencyName || !email) {
    throw createError({ statusCode: 400, message: 'Missing required fields' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createError({ statusCode: 400, message: 'Invalid email address' });
  }

  const db = getFirestore();
  const sanitizedEmail = email.trim().toLowerCase();

  try {
    // Check if user already exists
    const existingSnap = await db.collection('users').where('email', '==', sanitizedEmail).get();

    if (!existingSnap.empty) {
      throw createError({
        statusCode: 400,
        message: 'This email is already associated with a partner account.'
      });
    }

    // Save the request to the users collection with role: 'recruiter' and status: 'requested'
    await db.collection('users').add({
      agency_name: agencyName.trim(),
      email: sanitizedEmail,
      role: 'recruiter',
      status: 'requested',
      created_at: new Date().toISOString()
    });

    return { success: true };
  } catch (error: any) {
    console.error('🔥 Error requesting recruiter access:', error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: 'Failed to submit access request. Please try again later.'
    });
  }
});
