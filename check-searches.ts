import 'dotenv/config';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp();
const db = getFirestore();
async function run() {
  const snap = await db.collection('search_history').orderBy('timestamp', 'desc').limit(5).get();
  snap.docs.forEach(d => console.log(d.id, d.data()));
}
run();
