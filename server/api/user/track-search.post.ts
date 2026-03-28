import { FieldValue } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const db = useAdminFirestore();

  try {
    // 1. Basic validation to ensure we don't save empty/junk data
    if (!body.title || !body.country) {
      return { success: false, error: 'Missing required fields' };
    }

    // 2. Add document to the 'search_history' collection in Firestore
    await db.collection('search_history').add({
      // Sanitize the strings so your database is clean and easy to query later
      title: body.title.toLowerCase().trim(),
      country: body.country.toUpperCase(),
      location: body.location ? body.location.toLowerCase().trim() : null,

      // Cast salary to a strict Number
      salary: body.salary ? Number(body.salary) : null,

      // Additional metrics for better insights
      schedule: body.schedule ? body.schedule.toLowerCase().trim() : null,
      contract: body.contract ? body.contract.toLowerCase().trim() : null,

      // Let the server stamp the exact time
      timestamp: FieldValue.serverTimestamp(),

      // Grab the host header to know if they searched on AmIUnderpaid or BenchmarkMyRole
      domain: getRequestHeader(event, 'host') || 'unknown'
    });

    return { success: true };
  } catch {
    // We return a soft failure instead of throwing a 500 error
    // so we don't accidentally disrupt the user's flow on the frontend.
    return { success: false };
  }
});
