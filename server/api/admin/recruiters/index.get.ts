import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const authHeader = getRequestHeader(event, 'authorization');
  if (!authHeader?.startsWith('Bearer ')) return createError({ statusCode: 401 });
  const token = authHeader.split('Bearer ')[1];
  await getAuth().verifyIdToken(token || '');

  const db = getFirestore();
  const usersSnap = await db.collection('users').where('role', '==', 'recruiter').get();

  const pricingDoc = await db.collection('platform_settings').doc('pricing').get();
  const pricing = pricingDoc.data() || {};

  // Batch fetch users in chunks of 100 to get email verification statuses safely
  const uids = usersSnap.docs.map((doc) => ({ uid: doc.id }));
  const authUsers: any[] = [];

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

    let monthlyTotal = 0;
    activeTerritories.forEach((t: any) => {
      if (t.isBasic) {
        const bandPricing = countryPricing[`band${t.band || 1}`];
        let basicPrice = bandPricing?.basic || 0;
        if (data.basicDiscount) {
          basicPrice = basicPrice * (1 - data.basicDiscount / 100);
        }
        monthlyTotal += basicPrice;
      }
    });

    return {
      id: doc.id,
      email: data.email,
      agencyName: data.agency_name || 'N/A',
      categories: data.coveredCategories || [],
      territoriesCount: activeTerritories.length,
      verified: authMap.get(doc.id) || false,
      monthlyInvoice: monthlyTotal,
      billingCountry,
      basicDiscount: data.basicDiscount || 0,
      exclusiveDiscount: data.exclusiveDiscount || 0
    };
  });

  return { success: true, recruiters };
});
