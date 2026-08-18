// server/api/stripe/cancel-territory.post.ts
import Stripe from 'stripe';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { TerritoryClaim } from '~~/shared/utils/types';

type PricingBand = { basic: number; exclusive: number };
type CountryPricing = Record<string, PricingBand>;
type PlatformPricing = Record<string, CountryPricing>;

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const territoryIdToCancel = body.territoryId;
  const config = useRuntimeConfig();

  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2026-03-25.dahlia'
  });

  // 1. VERIFY USER
  const authHeader = getRequestHeader(event, 'authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await getAuth().verifyIdToken(token || '');
  const userId = decodedToken.uid;

  const db = getFirestore();
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  const userData = userDoc.data();

  if (!userData) {
    throw createError({ statusCode: 404, message: 'User not found' });
  }

  const currentTerritories: TerritoryClaim[] = userData.activeTerritories || [];
  const stripeSubId = userData.stripeSubscriptionId;

  // 2. FILTER OUT THE CANCELED TERRITORY
  const updatedTerritories = currentTerritories
    .map((t: TerritoryClaim) => {
      if (t.territoryId === territoryIdToCancel) {
        return { ...t, isBasic: false }; // Downgrade to remove the basic plan
      }
      return t;
    })
    .filter((t: TerritoryClaim) => {
      // ONLY completely remove the territory if it has NO basic plan AND NO exclusive months left
      return t.isBasic || (t.exclusiveMonths && t.exclusiveMonths.length > 0);
    });

  // 3. RECALCULATE THE NEW MONTHLY TOTAL
  // We must fetch pricing to know exactly how much to charge them now
  const pricingDoc = await db.collection('platform_settings').doc('pricing').get();

  const DEFAULT_PRICING: PlatformPricing = {
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

  const platformPricing: PlatformPricing = pricingDoc.exists
    ? pricingDoc.data() || {}
    : DEFAULT_PRICING;
  const currency = userData.billingCountry === 'USA' ? 'usd' : 'gbp';
  const countryPricing = platformPricing[userData.billingCountry || 'UK'];
  const basicDiscount = userData.basicDiscount || 0;

  let newMonthlyTotal = 0;
  updatedTerritories.forEach((t: TerritoryClaim) => {
    if (t.isBasic) {
      // If you don't have the band saved on the object, default to band 1
      const bandData = countryPricing?.[`band${t.band || 1}`];
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
    } catch {
      throw createError({ statusCode: 500, message: 'Failed to update billing with Stripe.' });
    }
  }

  // 5. IDENTIFY REMOVED EXCLUSIVE MONTHS for the cancelled territory
  const cancelledTerritory = currentTerritories.find(
    (t: TerritoryClaim) => t.territoryId === territoryIdToCancel
  );
  const removedExclusiveMonths: string[] = cancelledTerritory?.exclusiveMonths || [];

  // 6. ATOMIC BATCH: update user doc + clean up territory_claims
  const batch = db.batch();

  // 6a. Write the updated territories to the user doc
  batch.update(userRef, {
    activeTerritories: updatedTerritories,
    updatedAt: new Date().toISOString()
  });

  // 6b. Remove this user's locks and basic ownership from territory_category_owners atomically
  const wasBasic = cancelledTerritory?.isBasic;
  // If the territory is completely removed or just basic was cancelled, we might need to remove from basicOwners.
  // Wait, if it was just downgraded (isBasic = false), we must remove it from basicOwners.
  // If it was completely removed (not in updatedTerritories), it means isBasic was also removed.
  const isStillBasic = updatedTerritories.find(
    (t: TerritoryClaim) => t.territoryId === territoryIdToCancel
  )?.isBasic;
  const shouldRemoveBasic = wasBasic && !isStillBasic;

  if (removedExclusiveMonths.length > 0 || shouldRemoveBasic) {
    const claimDocId = `${territoryIdToCancel}_${cancelledTerritory?.categoryValue}`;
    const claimRef = db.collection('territory_category_owners').doc(claimDocId);
    const claimSnap = await claimRef.get();

    if (claimSnap.exists) {
      const claimData = claimSnap.data() || {};
      const takenMonths: Record<string, string> = claimData.takenExclusiveMonths || {};
      const basicOwners: string[] = claimData.basicOwners || [];

      // Count how many months remain after removing this user's months
      const remainingMonths = Object.entries(takenMonths).filter(
        ([month, ownerId]) => ownerId !== userId || !removedExclusiveMonths.includes(month)
      );

      const remainingBasic = basicOwners.filter((id) => id !== userId);

      if (remainingMonths.length === 0 && remainingBasic.length === 0) {
        // No months left AND no basic owners left — delete the entire claim document
        batch.delete(claimRef);
      } else {
        // Surgically remove only this user's cancelled properties
        const updates: Record<string, FirebaseFirestore.FieldValue> = {};

        if (removedExclusiveMonths.length > 0) {
          for (const month of removedExclusiveMonths) {
            if (takenMonths[month] === userId) {
              updates[`takenExclusiveMonths.${month}`] = FieldValue.delete();
            }
          }
        }

        if (shouldRemoveBasic) {
          updates.basicOwners = FieldValue.arrayRemove(userId);
        }

        if (Object.keys(updates).length > 0) {
          batch.update(claimRef, updates);
        }
      }
    }
  }

  await batch.commit();

  return { success: true, newTotal: newMonthlyTotal };
});
