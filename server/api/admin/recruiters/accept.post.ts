import crypto from 'crypto';
import { getAuth } from 'firebase-admin/auth';

export default defineEventHandler(async (event) => {
  await verifyAdmin(event);

  const body = await readBody(event);
  const { uid } = body;

  if (!uid) {
    throw createError({ statusCode: 400, message: 'Missing UID' });
  }

  const db = useAdminFirestore();
  const auth = getAuth(useAdminApp());

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
        message: `Cannot approve request in status: ${data.status || 'unknown'}`
      });
    }

    // 1. Generate secure temporary password
    const tempPassword = crypto.randomBytes(6).toString('hex'); // 12 characters

    // 2. Create the user in Firebase Auth using the Firestore document ID as UID
    await auth.createUser({
      uid,
      email: data.email,
      password: tempPassword,
      emailVerified: true
    });

    // 3. Update the Firestore user document status
    await docRef.update({
      status: 'active',
      requiresPasswordChange: true,
      updatedAt: new Date().toISOString()
    });

    // 4. Queue the confirmation email to the recruiter
    await db.collection('mail').add({
      to: data.email,
      message: {
        subject: 'Welcome to the platform - Your partner account is approved',
        html: `
          <h2>Your request for partner access has been approved!</h2>
          <p>Hi ${data.agency_name || 'there'},</p>
          <p>An account has been created for you. You can log in using your email address and the temporary one-time password below:</p>
          <p><strong>Login Email:</strong> ${data.email}</p>
          <p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
          <br/>
          <p>Please note that you will be required to change your password immediately upon your first login.</p>
          <p><a href="https://amiunderpaid.co.uk/recruiter/login">Click here to log in</a></p>
          <br/>
          <p>Best regards,<br/>The Platform Team</p>
        `,
        text: `Your request for partner access has been approved!\n\nHi ${data.agency_name || 'there'},\n\nAn account has been created for you. You can log in using your email address and the temporary one-time password below:\n\nLogin Email: ${data.email}\nTemporary Password: ${tempPassword}\n\nPlease note that you will be required to change your password immediately upon your first login.\n\nLog in here: https://amiunderpaid.co.uk/recruiter/login\n\nBest regards,\nThe Platform Team`
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('🔥 Error accepting recruiter:', error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to approve recruiter.'
    });
  }
});
