import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const useAdminFirestore = () => {
  const apps = getApps();

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

  const app = apps.length
    ? apps[0]!
    : initializeApp(serviceAccount ? { credential: cert(serviceAccount) } : undefined);

  return getFirestore(app);
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

  // Firestore batch limit is 500
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

      // Ensure dates are handled if passed as strings
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
