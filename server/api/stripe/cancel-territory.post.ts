// server/api/stripe/cancel-territory.post.ts
import Stripe from 'stripe';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const territoryIdToCancel = body.territoryId;
  const config = useRuntimeConfig();

  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2026-03-25.dahlia'
  });

  // 1. VERIFY USER
  const authHeader = getRequestHeader(event, 'authorization');
  if (!authHeader?.startsWith('Bearer '))
    return createError({ statusCode: 401, message: 'Unauthorized' });

  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await getAuth().verifyIdToken(token || '');
  const userId = decodedToken.uid;

  const db = getFirestore();
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  const userData = userDoc.data();

  if (!userData) return createError({ statusCode: 404, message: 'User not found' });

  const currentTerritories = userData.activeTerritories || [];
  const stripeSubId = userData.stripeSubscriptionId;

  // 2. FILTER OUT THE CANCELED TERRITORY
  const updatedTerritories = currentTerritories.filter(
    (t: any) => t.territoryId !== territoryIdToCancel
  );

  // 3. RECALCULATE THE NEW MONTHLY TOTAL
  // We must fetch pricing to know exactly how much to charge them now
  const pricingDoc = await db.collection('platform_settings').doc('pricing').get();
  const platformPricing = pricingDoc.data() || {};
  const currency = userData.billingCountry === 'USA' ? 'usd' : 'gbp';
  const countryPricing = platformPricing[userData.billingCountry || 'UK'];

  let newMonthlyTotal = 0;
  updatedTerritories.forEach((t: any) => {
    if (t.isBasic) {
      // If you don't have the band saved on the object, default to band 1
      const bandData = countryPricing[`band${t.band || 1}`];
      newMonthlyTotal += bandData?.basic || 10;
    }
  });

  // 4. UPDATE STRIPE
  if (stripeSubId) {
    try {
      if (newMonthlyTotal === 0) {
        // If they canceled their last basic plan, kill the subscription entirely!
        await stripe.subscriptions.cancel(stripeSubId);
        // Remove the sub ID from the database
        await userRef.update({ stripeSubscriptionId: null });
      } else {
        // They still have other territories, so we just downgrade the price
        const subscription = await stripe.subscriptions.retrieve(stripeSubId);
        const itemId = subscription.items.data[0]?.id;

        await stripe.subscriptions.update(stripeSubId, {
          items: [
            {
              id: itemId,
              price_data: {
                currency: currency,
                product: subscription.items.data[0]?.price.product as string,
                recurring: { interval: 'month' },
                unit_amount: newMonthlyTotal * 100 // Stripe uses cents/pence
              }
            }
          ],
          proration_behavior: 'none' // Don't refund them for the middle of this month
        });
      }
    } catch (stripeError) {
      console.error('Stripe update failed:', stripeError);
      return createError({ statusCode: 500, message: 'Failed to update billing with Stripe.' });
    }
  }

  // 5. SAVE THE NEW ARRAY TO FIREBASE
  await userRef.update({
    activeTerritories: updatedTerritories,
    updatedAt: new Date().toISOString()
  });

  return { success: true, newTotal: newMonthlyTotal };
});
