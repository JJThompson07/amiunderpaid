import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const authHeader = getRequestHeader(event, 'authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return createError({ statusCode: 401 });
  }
  const token = authHeader.split('Bearer ')[1]!;
  await getAuth().verifyIdToken(token);

  const body = await readBody(event);
  const { uid, basicDiscount, exclusiveDiscount } = body;

  if (!uid) {
    return createError({ statusCode: 400, message: 'Missing UID' });
  }

  const bDiscount = Number(basicDiscount) || 0;
  const eDiscount = Number(exclusiveDiscount) || 0;

  // Security Remediation: Explicitly validate the input limits server-side to prevent negative or > 100 values
  if (!Number.isFinite(bDiscount) || bDiscount < 0 || bDiscount > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Basic discount must be between 0 and 100.' });
  }
  if (!Number.isFinite(eDiscount) || eDiscount < 0 || eDiscount > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Exclusive discount must be between 0 and 100.' });
  }

  const db = getFirestore();
  await db
    .collection('users')
    .doc(uid)
    .update({
      basicDiscount: bDiscount,
      exclusiveDiscount: eDiscount,
      updatedAt: new Date().toISOString()
    });

  return { success: true };
});
