import { FieldValue } from 'firebase-admin/firestore';
type TrackSearchBody = {
  title: string;
  country: string;
  location?: string | null;
  salary?: string | number | null;
  schedule?: string | null;
  contract?: string | null;
  brand?: string | null;
  id?: string;
};

export default defineEventHandler(async (event) => {
  const body = await readBody<TrackSearchBody>(event);

  const db = useAdminFirestore();

  // Security Remediation: fail closed if the token-signing secret is missing,
  // rather than silently signing with a default (this must stay outside the
  // try/catch below, which swallows errors into a 200 `success: false`).
  const config = useRuntimeConfig();
  if (!config.searchTokenSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Server misconfiguration.' });
  }

  try {
    if (!body.title || !body.country) {
      return { success: false, error: 'Missing required fields' };
    }

    const docData = {
      title: body.title.toLowerCase().trim(),
      country: body.country.toUpperCase(),
      location: body.location ? body.location.toLowerCase().trim() : null,
      salary: body.salary ? Number(body.salary) : null,
      schedule: body.schedule ? body.schedule.toLowerCase().trim() : null,
      contract: body.contract ? body.contract.toLowerCase().trim() : null,
      brand: body.brand ? String(body.brand) : null,
      timestamp: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('search_history').add(docData);

    // Security Remediation: Mint an HMAC token to authenticate future updates to this specific search record
    const token = generateSearchToken(docRef.id, config.searchTokenSecret);

    return { success: true, id: docRef.id, token };
  } catch {
    // silent fail so not to disrupt the user
    return { success: false };
  }
});
