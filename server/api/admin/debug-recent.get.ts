import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const db = getFirestore();
  const snap = await db.collection('search_history').orderBy('timestamp', 'desc').limit(5).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
});
