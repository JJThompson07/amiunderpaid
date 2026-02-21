export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { title, location, country, gov_id_code, is_automatic } = body;

  if (!title || !gov_id_code) {
    throw createError({ statusCode: 400, statusMessage: 'Title and gov_id_code are required' });
  }

  // 1. Strict Sanitization Helpers
  // Removes HTML tags (< >) to prevent basic XSS if this data is ever rendered
  const sanitizeText = (str: any) =>
    String(str || '')
      .replace(/[<>]/g, '')
      .trim();

  // Gov IDs/SOC codes should generally just be alphanumeric (and maybe dashes)
  const sanitizedGovId = String(gov_id_code)
    .replace(/[^a-zA-Z0-9-]/g, '')
    .trim();

  if (!sanitizedGovId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid gov_id_code format' });
  }

  // 2. Apply Sanitization
  const titleStr = sanitizeText(title);
  const countryCode = sanitizeText(country || 'gb').toLowerCase();
  const locationStr = sanitizeText(location);

  const db = useAdminFirestore();

  try {
    // SECURITY FIX: Write to a suggestions collection for admin review
    // instead of overwriting the live adzuna_jobs_cache directly.
    const suggestionRef = db.collection('user_match_suggestions').doc();

    await suggestionRef.set({
      title: titleStr,
      location: locationStr,
      country: countryCode,
      suggested_gov_id: sanitizedGovId,
      is_automatic_system_save: !!is_automatic, // Tracks if this was a user click or a background save
      timestamp: new Date(),
      // Grab IP to help you filter out spam/bots if needed later
      ip_address: getRequestHeader(event, 'x-forwarded-for') || 'unknown'
    });

    return { success: true, message: 'Match suggestion securely logged for review.' };
  } catch (e) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to log suggestion.', data: e });
  }
});
