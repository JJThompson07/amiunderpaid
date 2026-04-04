import { FieldValue } from 'firebase-admin/firestore';
interface TrackSearchBody {
  title: string;
  country: string;
  location?: string | null;
  salary?: string | number | null;
  schedule?: string | null;
  contract?: string | null;
  brand?: string | null;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<TrackSearchBody>(event);

  const db = useAdminFirestore();

  try {
    if (!body.title || !body.country) {
      return { success: false, error: 'Missing required fields' };
    }

    await db.collection('search_history').add({
      title: body.title.toLowerCase().trim(),
      country: body.country.toUpperCase(),
      location: body.location ? body.location.toLowerCase().trim() : null,
      salary: body.salary ? Number(body.salary) : null,
      schedule: body.schedule ? body.schedule.toLowerCase().trim() : null,
      contract: body.contract ? body.contract.toLowerCase().trim() : null,
      brand: body.brand ? String(body.brand) : null,
      timestamp: FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch {
    // silent fail so not to disrupt the user
    return { success: false };
  }
});
