import crypto from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import type { EmailBrand } from '~~/server/utils/emailTemplate';
import { getBrandName, renderBrandedEmail } from '~~/server/utils/emailTemplate';

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
    // The brand/siteUrl the recruiter applied under were persisted at request-access
    // time (see request-access.post.ts); the admin's own request host cannot tell us
    // which brand this recruiter belongs to, and a single global runtimeConfig siteUrl
    // cannot represent all three brand domains this app serves off one deployment.
    const config = useRuntimeConfig();
    const brand: EmailBrand = data.site === 'benchmarkmyrole' ? 'benchmarkmyrole' : 'amiunderpaid';
    const siteUrl = data.siteUrl || config.public.siteUrl || 'https://amiunderpaid.co.uk';
    const loginUrl = `${siteUrl}/recruiter/login`;

    await db.collection('mail').add({
      to: data.email,
      message: {
        subject: 'Welcome to the platform - Your partner account is approved',
        html: renderBrandedEmail({
          brand,
          siteUrl,
          heading: 'Your request for partner access has been approved!',
          paragraphs: [
            `Hi ${data.agency_name || 'there'},`,
            'An account has been created for you. You can log in using your email address and the temporary one-time password below:',
            'Please note that you will be required to change your password immediately upon your first login.'
          ],
          dataBox: [{ label: 'Login Email', value: data.email }],
          credentialBox: { label: 'Temporary Password', code: tempPassword },
          cta: { label: 'Log In to Your Dashboard', url: loginUrl }
        }),
        text: `Your request for partner access has been approved!\n\nHi ${data.agency_name || 'there'},\n\nAn account has been created for you. You can log in using your email address and the temporary one-time password below:\n\nLogin Email: ${data.email}\nTemporary Password: ${tempPassword}\n\nPlease note that you will be required to change your password immediately upon your first login.\n\nLog in here: ${loginUrl}\n\nBest regards,\nThe ${getBrandName(brand)} Team`
      }
    });

    return { success: true };
  } catch (error) {
    // eslint-disable-next-line no-console -- surfaces recruiter approval failures for admin debugging; no dedicated server-side error-logging utility exists
    console.error('🔥 Error accepting recruiter:', error);
    if (isError(error)) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to approve recruiter.'
    });
  }
});
