import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineEventHandler, getHeader, getRequestHeader } from 'h3';

export default defineEventHandler(async (event) => {
  // If in local development (but not testing), abort
  if (import.meta.dev && process.env.NODE_ENV !== 'test') {
    return { status: 200, message: 'Local development session skipped' };
  }

  // Get geolocation headers
  let country = getHeader(event, 'x-vercel-ip-country') || getHeader(event, 'cf-ipcountry') || 'Unknown';
  let city = getHeader(event, 'x-vercel-ip-city') || 'Unknown';

  // Sanitize to avoid weird characters in object keys
  country = country.replace(/[^a-zA-Z0-9 -]/g, '').trim() || 'Unknown';
  city = city.replace(/[^a-zA-Z0-9 -]/g, '').trim() || 'Unknown';

  // YYYY-MM-DD UTC
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const db = getFirestore();
  const docRef = db.collection('user_sessions').doc(dateStr);

  try {
    await docRef.set(
      {
        total: FieldValue.increment(1),
        [`locations.${country}.${city}`]: FieldValue.increment(1),
      },
      { merge: true }
    );
  } catch (err) {
    // Fail silently so client isn't impacted
    console.error('Failed to log user session:', err);
  }

  return { status: 200, message: 'Session logged' };
});
