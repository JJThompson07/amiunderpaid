// server/api/admin/approve-suggestion.post.ts
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  // 1. Extract the country
  const { suggestionId, searchTerm, targetIdCode, targetGroupName, country } = body;

  const db = getFirestore();

  try {
    // 2. Dynamically route to the correct Master Dictionary
    const targetCollection = country === 'US' ? 'usa_job_groups' : 'uk_job_groups';

    const groupRef = db.collection(targetCollection).doc(targetIdCode);

    await groupRef.set(
      {
        group_name: targetGroupName,
        titles: FieldValue.arrayUnion(searchTerm)
      },
      { merge: true }
    );

    // Mark as approved in the queue
    await db.collection('job_suggestions').doc(suggestionId).update({
      status: 'approved'
    });

    // Trigger the Algolia Sync immediately after the DB update
    await $fetch('/api/admin/job-groups/migrate', {
      method: 'POST',
      headers: {
        // Forward the authorization header from the current request
        Authorization: getHeader(event, 'Authorization') || ''
      },
      body: { country }
    });

    return { success: true };
  } catch (error) {
    console.error('Error approving suggestion:', error);
    throw createError({ statusCode: 500, message: 'Approval failed' });
  }
});
