import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { H3Event } from 'h3';

export const useAdminApp = (): App => {
  const apps = getApps();
  // If VueFire already initialized the app via nuxt.config.ts, just use it!
  if (apps.length > 0) return apps[0]!;

  let serviceAccount: any;
  const b64Env = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (b64Env) {
    try {
      const decoded = Buffer.from(b64Env, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decoded);
    } catch (e) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error: Invalid Firebase credentials.',
        cause: e
      });
    }
  }

  return initializeApp(serviceAccount ? { credential: cert(serviceAccount) } : undefined);
};

export const useAdminFirestore = () => {
  return getFirestore(useAdminApp());
};

export const verifyAdmin = async (event: H3Event) => {
  const auth = getAuth(useAdminApp());

  // 1. Check for the fresh Authorization Bearer token first (Client-side fetches)
  const authHeader = getHeader(event, 'Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1] || '';
    try {
      await auth.verifyIdToken(idToken);
      return; // Access granted via fresh client token!
    } catch {
      console.warn('ID Token invalid, falling back to cookie check...');
    }
  }

  // 2. SSR Fallback: Check the __session cookie (Server-side fetches)
  const sessionCookie = getCookie(event, '__session');
  if (!sessionCookie) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: No session cookie or token'
    });
  }

  try {
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
