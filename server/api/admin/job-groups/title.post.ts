// server/api/admin/job-groups/title.post.ts
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { country, idCode, newTitle } = body;

  if (!idCode || !newTitle) return { success: false, message: 'Missing fields' };

  const collectionName = country === 'USA' ? 'usa_job_groups' : 'uk_job_groups';
  const db = getFirestore();

  try {
    await db
      .collection(collectionName)
      .doc(idCode)
      .set(
        {
          titles: FieldValue.arrayUnion(newTitle.trim().toLowerCase())
        },
        { merge: true }
      );

    return { success: true };
  } catch {
    throw createError({ statusCode: 500, message: 'Failed to add title' });
  }
});
