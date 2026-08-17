import { getAuth } from 'firebase-admin/auth';

export default defineEventHandler(async (event) => {
  // This endpoint is protected by server/middleware/admin-guard.ts
  // Only existing admins (with the claim) can reach this block.

  const body = await readBody(event);
  const uid = body?.uid;

  if (!uid || typeof uid !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'A valid uid is required to grant admin access.'
    });
  }

  // We explicitly use the custom claim for security rather than just a document field.
  // This ensures that the user is genuinely recognized as an admin by the Firebase token.
  try {
    const auth = getAuth(useAdminApp());
    await auth.setCustomUserClaims(uid, { admin: true });

    // Also update the Firestore profile so the UI logic works correctly
    const db = useAdminFirestore();
    await db.collection('users').doc(uid).set({ role: 'admin' }, { merge: true });

    return { success: true };
  } catch (err: any) {
    console.error(`Failed to grant admin claim to ${uid}:`, err);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to provision admin access.'
    });
  }
});
