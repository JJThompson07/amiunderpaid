import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  // We can't rely on verifyAdmin here because the admins don't have the claim yet!
  // We should protect this endpoint using a secret token in the headers for local one-time execution.
  const config = useRuntimeConfig();
  const authHeader = getHeader(event, 'Authorization');
  
  // A simple dev-gate or secret check. Let's use import.meta.dev but on the server it's process.dev
  if (!process.dev) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: This script can only be run in development mode.'
    });
  }

  const db = getFirestore();
  const auth = getAuth();
  
  const adminsSnapshot = await db.collection('users').where('role', '==', 'admin').get();
  
  let migratedCount = 0;
  
  for (const doc of adminsSnapshot.docs) {
    const uid = doc.id;
    try {
      await auth.setCustomUserClaims(uid, { admin: true });
      migratedCount++;
    } catch (error) {
      console.error(`Failed to set claim for ${uid}:`, error);
    }
  }

  return { success: true, migratedCount };
});
