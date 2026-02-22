import { FieldValue } from 'firebase-admin/firestore';
import { useAdminFirestore } from '~~/server/utils/firebase';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { title, location, country, gov_id_code, is_automatic, gov_title } = body;

  if (!title || !gov_id_code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields for suggestion.'
    });
  }

  // Sanitize and format inputs securely
  const titleStr = String(title).trim().toLowerCase();
  const locationStr = location ? String(location).trim().toLowerCase() : '';
  const countryCode = String(country || 'gb').toLowerCase();
  const sanitizedGovId = String(gov_id_code).trim();
  const sanitizedGovTitle = gov_title ? String(gov_title).trim() : 'Unknown Role';

  const ipAddress = getRequestHeader(event, 'x-forwarded-for') || 'unknown';

  const db = useAdminFirestore();
  const suggestionsRef = db.collection('user_match_suggestions');

  try {
    // 1. DEDUPLICATION: Check if this exact Title + Gov ID combo already exists in the queue
    const existingSnap = await suggestionsRef
      .where('title', '==', titleStr)
      .where('suggested_gov_id', '==', sanitizedGovId)
      .where('country', '==', countryCode)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      // 2. SPAM PREVENTION: It already exists! Just bump the vote count.
      const existingDoc = existingSnap.docs[0];

      if (existingDoc) {
        await existingDoc.ref.update({
          votes: FieldValue.increment(1),
          last_suggested_at: new Date(),
          // If a human manually clicked it (is_automatic = false), override the system flag so you know it was verified
          is_automatic_system_save: is_automatic
            ? existingDoc.data().is_automatic_system_save
            : false
        });

        return { success: true, message: 'Suggestion vote incremented!' };
      }
    }

    // 3. NEW SUGGESTION: Only create a new document if we've never seen this combo before
    await suggestionsRef.add({
      title: titleStr,
      location: locationStr,
      country: countryCode,
      suggested_gov_id: sanitizedGovId,
      suggested_gov_title: sanitizedGovTitle,
      is_automatic_system_save: !!is_automatic,
      timestamp: new Date(),
      last_suggested_at: new Date(),
      votes: 1, // Start the counter
      ip_address: ipAddress
    });

    return { success: true, message: 'New match suggestion logged safely!' };
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to log suggestion',
      data: e.message
    });
  }
});
