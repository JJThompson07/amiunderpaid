import { initializeApp, getApps, cert, type App, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { H3Event } from 'h3';

export const useAdminApp = (): App => {
  const apps = getApps();
  if (apps.length > 0) return apps[0]!;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  let serviceAccount: ServiceAccount | undefined;

  if (serviceAccountJson) {
    try {
      let parsed = JSON.parse(serviceAccountJson);

      // Fix for double-stringified JSON from .env files
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }

      serviceAccount = parsed;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      console.error('CRITICAL CONFIG ERROR: FIREBASE_SERVICE_ACCOUNT is not valid JSON.');
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error: Invalid Firebase credentials.'
      });
    }
  }

  return initializeApp(serviceAccount ? { credential: cert(serviceAccount) } : undefined);
};

export const useAdminFirestore = () => {
  return getFirestore(useAdminApp());
};

export const verifyAdmin = async (event: H3Event) => {
  const sessionCookie = getCookie(event, '__session');
  if (!sessionCookie) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized: No session cookie' });
  }

  try {
    const auth = getAuth(useAdminApp());
    await auth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
    const message = (error as Error).message;

    throw createError({
      statusCode: 401,
      statusMessage: message ?? 'Unauthorized: Invalid session'
    });
  }
};

export const batchDelete = async (collectionName: string, filters: Record<string, any>) => {
  const db = useAdminFirestore();
  let query: any = db.collection(collectionName);

  for (const [key, value] of Object.entries(filters)) {
    query = query.where(key, '==', value);
  }

  const snapshot = await query.get();
  if (snapshot.empty) return 0;

  let count = 0;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += 500) {
    const chunk = docs.slice(i, i + 500);
    const batch = db.batch();
    chunk.forEach((doc: any) => batch.delete(doc.ref));
    await batch.commit();
    count += chunk.length;
  }

  return count;
};

export const batchSeed = async (collectionName: string, data: any[]) => {
  const db = useAdminFirestore();
  let count = 0;

  for (let i = 0; i < data.length; i += 500) {
    const chunk = data.slice(i, i + 500);
    const batch = db.batch();

    chunk.forEach((item) => {
      const { objectID, ...rest } = item;
      const docRef = objectID
        ? db.collection(collectionName).doc(objectID)
        : db.collection(collectionName).doc();

      if (rest.updatedAt) {
        rest.updatedAt = new Date(rest.updatedAt);
      }

      batch.set(docRef, rest);
    });

    await batch.commit();
    count += chunk.length;
  }

  return count;
};
