// server/api/adzuna/update-match.post.ts
import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const db = getFirestore();

  const cleanSearchTerm = (body.title || '').trim().toLowerCase();
  if (!cleanSearchTerm || !body.gov_id_code) return { success: false };

  // 1. Grab the country from the request body
  const countryCode =
    body.country === 'us' || body.country === 'US' || body.country === 'USA' ? 'USA' : 'UK';

  try {
    const suggestionsRef = db.collection('job_suggestions');

    // 2. Include country in the duplicate check!
    const existingQuery = await suggestionsRef
      .where('search_term', '==', cleanSearchTerm)
      .where('target_id_code', '==', body.gov_id_code)
      .where('country', '==', countryCode) // 👈 Added country check
      .where('status', '==', 'pending')
      .get();

    if (!existingQuery.empty && existingQuery.docs[0]) {
      const docId = existingQuery.docs[0].id;
      const currentCount = existingQuery.docs[0].data().count || 1;
      await suggestionsRef.doc(docId).update({ count: currentCount + 1 });
    } else {
      await suggestionsRef.add({
        search_term: cleanSearchTerm,
        target_id_code: body.gov_id_code,
        target_group_name: body.gov_title,
        country: countryCode, // 👈 Save the country to the queue!
        count: 1,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    }

    return { success: true };
  } catch {
    return { success: false };
  }
});
