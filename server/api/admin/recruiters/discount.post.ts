import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const authHeader = getRequestHeader(event, 'authorization');
  if (!authHeader?.startsWith('Bearer ')) return createError({ statusCode: 401 });
  const token = authHeader.split('Bearer ')[1];
  await getAuth().verifyIdToken(token);

  const body = await readBody(event);
  const { uid, basicDiscount, exclusiveDiscount } = body;

  if (!uid) return createError({ statusCode: 400, message: 'Missing UID' });

  const db = getFirestore();
  await db
    .collection('users')
    .doc(uid)
    .update({
      basicDiscount: Number(basicDiscount) || 0,
      exclusiveDiscount: Number(exclusiveDiscount) || 0,
      updatedAt: new Date().toISOString()
    });

  return { success: true };
});
