// server/api/stripe/cancel-territory.post.ts
import Stripe from 'stripe';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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
  const updatedTerritories = currentTerritories
    .map((t: any) => {
      if (t.territoryId === territoryIdToCancel) {
        return { ...t, isBasic: false }; // Downgrade to remove the basic plan
      }
      return t;
    })
    .filter((t: any) => {
      // ONLY completely remove the territory if it has NO basic plan AND NO exclusive months left
      return t.isBasic || (t.exclusiveMonths && t.exclusiveMonths.length > 0);
    });

  // 3. RECALCULATE THE NEW MONTHLY TOTAL
  // We must fetch pricing to know exactly how much to charge them now
  const pricingDoc = await db.collection('platform_settings').doc('pricing').get();

  const DEFAULT_PRICING: Record<string, any> = {
    UK: {
      band1: { basic: 50, exclusive: 250 },
      band2: { basic: 30, exclusive: 150 },
      band3: { basic: 20, exclusive: 100 },
      band4: { basic: 10, exclusive: 50 },
      band5: { basic: 5, exclusive: 25 }
    },
    USA: {
      band1: { basic: 60, exclusive: 300 },
      band2: { basic: 40, exclusive: 200 },
      band3: { basic: 25, exclusive: 125 },
      band4: { basic: 15, exclusive: 75 },
      band5: { basic: 10, exclusive: 50 }
    }
  };

  const platformPricing = pricingDoc.exists ? pricingDoc.data() || {} : DEFAULT_PRICING;
  const currency = userData.billingCountry === 'USA' ? 'usd' : 'gbp';
  const countryPricing = platformPricing[userData.billingCountry || 'UK'];
  const basicDiscount = userData.basicDiscount || 0;

  let newMonthlyTotal = 0;
  updatedTerritories.forEach((t: any) => {
    if (t.isBasic) {
      // If you don't have the band saved on the object, default to band 1
      const bandData = countryPricing[`band${t.band || 1}`];
      let basicPrice = bandData?.basic || 10;
      if (basicDiscount > 0) {
        basicPrice = basicPrice * (1 - basicDiscount / 100);
      }
      newMonthlyTotal += Math.max(0, basicPrice);
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

  // 5. IDENTIFY REMOVED EXCLUSIVE MONTHS for the cancelled territory
  const cancelledTerritory = currentTerritories.find(
    (t: any) => t.territoryId === territoryIdToCancel
  );
  const removedExclusiveMonths: string[] = cancelledTerritory?.exclusiveMonths || [];

  // 6. ATOMIC BATCH: update user doc + clean up territory_claims
  const batch = db.batch();

  // 6a. Write the updated territories to the user doc
  batch.update(userRef, {
    activeTerritories: updatedTerritories,
    updatedAt: new Date().toISOString()
  });

  // 6b. Remove this user's exclusive month locks from territory_claims atomically
  if (removedExclusiveMonths.length > 0) {
    const claimDocId = `${territoryIdToCancel}_${cancelledTerritory?.categoryValue}`;
    const claimRef = db.collection('territory_claims').doc(claimDocId);
    const claimSnap = await claimRef.get();

    if (claimSnap.exists) {
      const claimData = claimSnap.data() || {};
      const takenMonths: Record<string, string> = claimData.takenExclusiveMonths || {};

      // Count how many months remain after removing this user's months
      const remainingMonths = Object.entries(takenMonths).filter(
        ([month, ownerId]) => ownerId !== userId || !removedExclusiveMonths.includes(month)
      );

      if (remainingMonths.length === 0) {
        // No months left — delete the entire claim document
        batch.delete(claimRef);
      } else {
        // Surgically remove only this user's cancelled months
        const deletions: Record<string, ReturnType<typeof FieldValue.delete>> = {};
        for (const month of removedExclusiveMonths) {
          if (takenMonths[month] === userId) {
            deletions[`takenExclusiveMonths.${month}`] = FieldValue.delete();
          }
        }
        if (Object.keys(deletions).length > 0) {
          batch.update(claimRef, deletions);
        }
      }
    }
  }

  await batch.commit();

  return { success: true, newTotal: newMonthlyTotal };
});
