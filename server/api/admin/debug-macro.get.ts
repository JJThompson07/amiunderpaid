export default defineEventHandler(async (event) => {
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore();
  const snap = await db.collection('national_baseline').doc('latest').get();
  return snap.data();
});
