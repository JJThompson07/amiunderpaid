// server/api/admin/recruiters/set-national.post.ts
import Stripe from 'stripe';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { TerritoryClaim } from '~~/shared/utils/types';

type PricingBand = { basic: number; exclusive: number };
type CountryPricing = Record<string, PricingBand>;
type PlatformPricing = Record<string, CountryPricing>;

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

type ClaimCleanup = {
  ref: FirebaseFirestore.DocumentReference;
  updates: Record<string, FirebaseFirestore.FieldValue>;
  shouldDelete: boolean;
};

export default defineEventHandler(async (event) => {
  // Admin auth is already enforced globally for /api/admin/** by
  // server/middleware/admin-guard.ts (verifyAdmin) -- no manual check needed here.
  const body = await readBody(event);
  const { uid, country, active } = body;

  if (!uid || (country !== 'UK' && country !== 'USA') || typeof active !== 'boolean') {
    throw createError({
      statusCode: 400,
      message: 'Missing or invalid uid, country, or active.'
    });
  }

  const nationalStatusKey = country === 'UK' ? 'ukNationalStatus' : 'usaNationalStatus';
  const otherNationalStatusKey = country === 'UK' ? 'usaNationalStatus' : 'ukNationalStatus';
  const isInTargetCountry = (territoryId: number): boolean =>
    country === 'UK' ? territoryId < 200 : territoryId >= 200;

  const config = useRuntimeConfig();
  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2026-03-25.dahlia'
  });
  const db = getFirestore();

  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();
  const userData = userDoc.data();

  if (!userData) {
    throw createError({ statusCode: 404, message: 'User not found' });
  }

  const stripeSubId = userData.stripeSubscriptionId;
  // Granting without an existing subscription is now allowed: the recruiter is
  // set to 'pending' with no Stripe call and no local-claim wipe -- confirmation
  // (and the wipe) happens later, once they actually pay, in webhook.post.ts. A
  // subscription-less recruiter cannot hold a real local claim in the first
  // place (every claim requires a prior checkout, which requires a subscription),
  // so there is nothing to wipe here regardless.

  const currentTerritories: TerritoryClaim[] = userData.activeTerritories || [];

  // 1. ON ACTIVE GRANT ONLY: strip local claims for the target country and stage
  // the surgical territory_category_owners cleanup (mirrors cancel-territory.post.ts's
  // pattern exactly -- remove only this uid, never blanket-delete a shared doc).
  let updatedTerritories = currentTerritories;
  const claimCleanups: ClaimCleanup[] = [];

  if (active && stripeSubId) {
    const targetClaims = currentTerritories.filter((t) => isInTargetCountry(t.territoryId));
    updatedTerritories = currentTerritories.filter((t) => !isInTargetCountry(t.territoryId));

    // Read every target claim doc concurrently instead of sequentially awaiting
    // each `.get()` in the loop -- a recruiter with many territories otherwise
    // pays for N round-trips back-to-back instead of one.
    const targetClaimRefs = targetClaims.map((claim) =>
      db.collection('territory_category_owners').doc(`${claim.territoryId}_${claim.categoryValue}`)
    );
    const targetClaimSnaps = await Promise.all(targetClaimRefs.map((ref) => ref.get()));

    for (const [index, claimSnap] of targetClaimSnaps.entries()) {
      if (!claimSnap.exists) {
        continue;
      }
      const claimRef = targetClaimRefs[index]!;

      const claimData = claimSnap.data() || {};
      const takenMonths: Record<string, string> = claimData.takenExclusiveMonths || {};
      const basicOwners: string[] = claimData.basicOwners || [];

      const remainingMonths = Object.entries(takenMonths).filter(([, ownerId]) => ownerId !== uid);
      const remainingBasic = basicOwners.filter((id) => id !== uid);

      if (remainingMonths.length === 0 && remainingBasic.length === 0) {
        claimCleanups.push({ ref: claimRef, updates: {}, shouldDelete: true });
        continue;
      }

      const updates: Record<string, FirebaseFirestore.FieldValue> = {};
      for (const [month, ownerId] of Object.entries(takenMonths)) {
        if (ownerId === uid) {
          updates[`takenExclusiveMonths.${month}`] = FieldValue.delete();
        }
      }
      if (basicOwners.includes(uid)) {
        updates.basicOwners = FieldValue.arrayRemove(uid);
      }
      if (Object.keys(updates).length > 0) {
        claimCleanups.push({ ref: claimRef, updates, shouldDelete: false });
      }
    }
  }

  // 2. RECALCULATE THE STRIPE TOTAL from the resulting territory list + national flags
  const pricingDoc = await db.collection('platform_settings').doc('pricing').get();
  const platformPricing: PlatformPricing = pricingDoc.exists
    ? (pricingDoc.data() as PlatformPricing | undefined) || {}
    : DEFAULT_PRICING;
  const countryPricing = platformPricing[userData.billingCountry || 'UK'];

  if (!countryPricing) {
    throw createError({
      statusCode: 500,
      message: 'Failed to process pricing.'
    });
  }

  const basicDiscount = userData.basicDiscount || 0;

  let newMonthlyTotal = 0;
  updatedTerritories.forEach((t: TerritoryClaim) => {
    if (t.isBasic) {
      const bandKey = `band${t.band || 1}`;
      const bandData = countryPricing[bandKey];
      if (!bandData) {
        throw createError({
          statusCode: 500,
          message: 'Failed to process pricing.'
        });
      }
      let basicPrice = bandData.basic;
      if (basicDiscount > 0) {
        basicPrice = basicPrice * (1 - basicDiscount / 100);
      }
      newMonthlyTotal += Math.max(0, basicPrice);
    }
  });

  // National coverage is a single flat Band 1 basic charge per BILLED flag, added
  // once (not per-territory) -- see design.md's "Dual-Flag Currency Edge Case". A
  // 'pending' flag (no subscription yet) is never billed, so it's excluded here.
  const otherFlagActive = userData[otherNationalStatusKey] === 'active';
  const thisFlagBilledAfter = active && Boolean(stripeSubId);
  const activeNationalFlagsAfter = (thisFlagBilledAfter ? 1 : 0) + (otherFlagActive ? 1 : 0);
  if (activeNationalFlagsAfter > 0) {
    const band1Data = countryPricing.band1;
    if (!band1Data) {
      throw createError({
        statusCode: 500,
        message: 'Failed to process pricing.'
      });
    }
    let nationalBasicPrice = band1Data.basic;
    if (basicDiscount > 0) {
      nationalBasicPrice = nationalBasicPrice * (1 - basicDiscount / 100);
    }
    newMonthlyTotal += Math.max(0, nationalBasicPrice) * activeNationalFlagsAfter;
  }

  // 3. UPDATE STRIPE FIRST -- only commit Firestore once billing is confirmed,
  // mirroring cancel-territory.post.ts's existing safety ordering.
  if (stripeSubId) {
    try {
      if (newMonthlyTotal === 0 && activeNationalFlagsAfter === 0) {
        await stripe.subscriptions.cancel(stripeSubId);
        await userRef.update({ stripeSubscriptionId: null });
      } else {
        const subscription = await stripe.subscriptions.retrieve(stripeSubId);
        const itemId = subscription.items.data[0]?.id;
        const currency = userData.billingCountry === 'USA' ? 'usd' : 'gbp';

        await stripe.subscriptions.update(stripeSubId, {
          items: [
            {
              id: itemId,
              price_data: {
                currency,
                product: subscription.items.data[0]?.price.product as string,
                recurring: { interval: 'month' },
                unit_amount: newMonthlyTotal * 100
              }
            }
          ],
          proration_behavior: 'none'
        });
      }
    } catch {
      throw createError({ statusCode: 500, message: 'Failed to update billing with Stripe.' });
    }
  }

  // 4. COMMIT FIRESTORE (user doc + claim doc cleanups) atomically
  const newStatus: 'pending' | 'active' | null = active
    ? stripeSubId
      ? 'active'
      : 'pending'
    : null;

  const batch = db.batch();

  batch.update(userRef, {
    activeTerritories: updatedTerritories,
    [nationalStatusKey]: newStatus ?? FieldValue.delete(),
    updatedAt: new Date().toISOString()
  });

  for (const cleanup of claimCleanups) {
    if (cleanup.shouldDelete) {
      batch.delete(cleanup.ref);
    } else {
      batch.update(cleanup.ref, cleanup.updates);
    }
  }

  await batch.commit();

  return { success: true, newTotal: newMonthlyTotal, status: newStatus };
});
