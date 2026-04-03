// server/api/admin/job-groups/title.delete.ts
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { country, idCode, titleToRemove } = body;

  const collectionName = country === 'USA' ? 'usa_job_groups' : 'uk_job_groups';
  const db = getFirestore();

  try {
    await db
      .collection(collectionName)
      .doc(idCode)
      .update({
        titles: FieldValue.arrayRemove(titleToRemove)
      });

    return { success: true };
  } catch {
    throw createError({ statusCode: 500, message: 'Failed to remove title' });
  }
});
