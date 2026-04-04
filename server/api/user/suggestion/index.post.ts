import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const db = getFirestore();

  const cleanSearchTerm = (body.search_term || '').trim().toLowerCase();
  if (!cleanSearchTerm || !body.target_id_code) return { success: false };

  // Standardize country code
  const countryCode =
    body.country === 'us' || body.country === 'US' || body.country === 'USA' ? 'USA' : 'UK';

  try {
    const suggestionsRef = db.collection('job_suggestions');

    // Check for an existing pending suggestion for this term + target + country combo
    const existingQuery = await suggestionsRef
      .where('search_term', '==', cleanSearchTerm)
      .where('target_id_code', '==', body.target_id_code)
      .where('country', '==', countryCode)
      .where('status', '==', 'pending')
      .get();

    if (!existingQuery.empty && existingQuery.docs[0]) {
      const docId = existingQuery.docs[0].id;
      const currentCount = existingQuery.docs[0].data().count || 1;
      await suggestionsRef.doc(docId).update({ count: currentCount + 1 });
    } else {
      await suggestionsRef.add({
        search_term: cleanSearchTerm,
        target_id_code: body.target_id_code,
        target_group_name: body.target_group_name || '',
        country: countryCode,
        count: 1,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to log ambiguity suggestion:', error);
    return { success: false };
  }
});
