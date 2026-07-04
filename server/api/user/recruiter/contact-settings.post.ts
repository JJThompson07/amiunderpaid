import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  // 1. Authenticate the Request
  const authHeader = getRequestHeader(event, 'authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await getAuth().verifyIdToken(token || '');
  const userId = decodedToken.uid;

  // 2. Extract Payload
  const body = await readBody(event);
  const { title, content, buttonText, brandBgColour, brandTextColour, categoryContent, logoUrl } =
    body;

  // 3. Save to the dedicated collection
  const db = getFirestore();
  await db
    .collection('recruiter_contact_settings')
    .doc(userId)
    .set(
      {
        recruiterId: userId,
        title: title || '',
        content: content || '',
        buttonText: buttonText || '',
        brandBgColour: brandBgColour || '#4f46e5',
        brandTextColour: brandTextColour || '#ffffff',
        categoryContent: categoryContent || {},
        logoUrl: logoUrl || '',
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

  return { success: true };
});
