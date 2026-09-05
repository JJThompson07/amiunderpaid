import { getAuth, type UserRecord } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { TerritoryClaim } from '~~/shared/utils/types';

export default defineEventHandler(async (event) => {
  const authHeader = getRequestHeader(event, 'authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401 });
  }
  const token = authHeader.split('Bearer ')[1];
  await getAuth().verifyIdToken(token || '');

  const db = getFirestore();
  const usersSnap = await db.collection('users').where('role', '==', 'recruiter').get();

  const pricingDoc = await db.collection('platform_settings').doc('pricing').get();
  const pricing = pricingDoc.data() || {};

  // Batch fetch users in chunks of 100 to get email verification statuses safely
  const recruitersToFetch = usersSnap.docs.filter((doc) => {
    const status = doc.data().status;
    return status !== 'requested' && status !== 'rejected';
  });
  const uids = recruitersToFetch.map((doc) => ({ uid: doc.id }));
  const authUsers: UserRecord[] = [];

  for (let i = 0; i < uids.length; i += 100) {
    const chunk = uids.slice(i, i + 100);
    const authResult = await getAuth().getUsers(chunk);
    authUsers.push(...authResult.users);
  }
  const authMap = new Map(authUsers.map((u) => [u.uid, u.emailVerified]));

  const recruiters = usersSnap.docs.map((doc) => {
    const data = doc.data();
    const activeTerritories = data.activeTerritories || [];
    const billingCountry = data.billingCountry || 'UK';
    const countryPricing = pricing[billingCountry] || {};
    const status = data.status || 'active'; // Default to active for legacy recruiters

    let monthlyTotal = 0;
    activeTerritories.forEach((t: TerritoryClaim) => {
      if (t.isBasic) {
        const bandPricing = countryPricing[`band${t.band || 1}`];
        let basicPrice = bandPricing?.basic || 0;
        if (data.basicDiscount) {
          basicPrice = basicPrice * (1 - data.basicDiscount / 100);
        }
        monthlyTotal += basicPrice;
      }
    });

    // National coverage is a flat Band 1 basic charge per ACTIVE (billed) status,
    // added once (not per-territory) -- must be reflected here too or this admin
    // listing under-reports a nationally-flagged recruiter's real monthly total.
    // 'pending' grants aren't billed yet, so they're excluded.
    const activeNationalFlags =
      (data.ukNationalStatus === 'active' ? 1 : 0) + (data.usaNationalStatus === 'active' ? 1 : 0);
    if (activeNationalFlags > 0) {
      let nationalBasicPrice = countryPricing.band1?.basic || 0;
      if (data.basicDiscount) {
        nationalBasicPrice = nationalBasicPrice * (1 - data.basicDiscount / 100);
      }
      monthlyTotal += nationalBasicPrice * activeNationalFlags;
    }

    return {
      id: doc.id,
      email: data.email,
      agencyName: data.agency_name || 'N/A',
      categories: data.coveredCategories || [],
      activeTerritories,
      territoriesCount: activeTerritories.length,
      verified: status === 'active' ? authMap.get(doc.id) || false : false,
      status,
      monthlyInvoice: monthlyTotal,
      billingCountry,
      basicDiscount: data.basicDiscount || 0,
      exclusiveDiscount: data.exclusiveDiscount || 0,
      ukNationalStatus: data.ukNationalStatus || null,
      usaNationalStatus: data.usaNationalStatus || null
    };
  });

  return { success: true, recruiters };
});
