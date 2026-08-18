import Stripe from 'stripe';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { TerritoryClaim } from '~~/shared/utils/types';

async function queueRefundAndAlert(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  reason: string
): Promise<void> {
  // This is the only record of a territory conflict that fulfilment silently
  // swallows (the webhook still returns 200 so Stripe stops retrying), so it
  // must stay logged for ops to catch and manually refund/alert on.
  // eslint-disable-next-line no-console
  console.error(`🚨 ALERT: Needs manual refund! Session ${session.id}. Reason: ${reason}`);
  // In a real system, you'd trigger an alert or automatically refund via stripe.refunds.create()
}

export default defineEventHandler(async (event) => {
  // 1. Initialize config and Stripe
  const config = useRuntimeConfig();
  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2026-03-25.dahlia'
  });

  // 2. CRITICAL: Get the raw string body, NOT the parsed JSON!
  const rawBody = await readRawBody(event);
  const stripeSignature = getHeader(event, 'stripe-signature');

  let stripeEvent;

  try {
    // 3. Verify the signature using the raw string and your webhook secret
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody as string,
      stripeSignature as string,
      config.stripeWebhookSecret
    );
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid signature' });
  }

  // 4. Process the successful payment
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    const db = getFirestore();

    // Security Remediation: Deduplicate webhook events to prevent double processing
    const seen = db.collection('stripe_events').doc(stripeEvent.id);
    if ((await seen.get()).exists) {
      return { received: true };
    }

    try {
      const userId = session.metadata?.userId;
      const rawCart = session.metadata?.cart;

      if (!userId || !rawCart) {
        throw new Error('Missing metadata in Stripe session');
      }

      // UN-COMPRESS THE CART
      const purchasedItems: TerritoryClaim[] = rawCart.split(',').map((itemStr) => {
        const [tId, catCode, hasBasic, excMonths] = itemStr.split(':');
        return {
          territoryId: Number(tId),
          categoryValue: catCode || '',
          isBasic: hasBasic === '1',
          exclusiveMonths: !excMonths || excMonths === 'none' ? [] : excMonths.split('~')
        };
      });

      const db = getFirestore();

      await db.runTransaction(async (t) => {
        // GET THE USER'S CURRENT PROFILE
        const userRef = db.collection('users').doc(userId);
        const userDoc = await t.get(userRef);
        const userData = userDoc.data() || {};

        const existingTerritories: TerritoryClaim[] = userData.activeTerritories || [];
        const updatedTerritories = [...existingTerritories];

        // PRE-FETCH ALL CLAIM DOCUMENTS
        const claimRefs: Record<string, FirebaseFirestore.DocumentReference> = {};
        const claimDocs: Record<string, FirebaseFirestore.DocumentData | null> = {};
        for (const item of purchasedItems) {
          const claimDocId = `${item.territoryId}_${item.categoryValue}`;
          if (!claimRefs[claimDocId]) {
            claimRefs[claimDocId] = db.collection('territory_category_owners').doc(claimDocId);
          }
        }

        const refsArray = Object.values(claimRefs);
        if (refsArray.length > 0) {
          const snapshots = await t.getAll(...refsArray);
          snapshots.forEach((snap) => {
            claimDocs[snap.id] = snap.exists ? (snap.data() ?? null) : null;
          });
        }

        for (const item of purchasedItems) {
          // --- UPDATE 1: THE USER'S PROFILE DATA ---
          const existingIndex = updatedTerritories.findIndex(
            (tItem) =>
              tItem.territoryId === item.territoryId && tItem.categoryValue === item.categoryValue
          );

          if (existingIndex > -1) {
            // Upgrade existing territory
            const existingTerritory = updatedTerritories[existingIndex]!;
            existingTerritory.isBasic = item.isBasic || existingTerritory.isBasic;
            const combinedMonths = new Set([
              ...(existingTerritory.exclusiveMonths || []),
              ...item.exclusiveMonths
            ]);
            existingTerritory.exclusiveMonths = Array.from(combinedMonths);
          } else {
            // Brand new territory
            updatedTerritories.push(item);
          }

          // --- UPDATE 2: THE GLOBAL LOCK & BASIC OWNERS ---
          const claimDocId = `${item.territoryId}_${item.categoryValue}`;
          const existingClaimData = claimDocs[claimDocId] || {};
          const updates: {
            takenExclusiveMonths?: Record<string, string>;
            basicOwners?: FirebaseFirestore.FieldValue;
            territoryId?: number;
            categoryValue?: string;
            updatedAt?: string;
          } = {};

          if (item.exclusiveMonths && item.exclusiveMonths.length > 0) {
            const takenMonths = existingClaimData.takenExclusiveMonths || {};
            const newExclusiveLocks: Record<string, string> = {};
            for (const month of item.exclusiveMonths) {
              if (takenMonths[month] && takenMonths[month] !== userId) {
                throw new Error(`Territory ${claimDocId} is already taken for month ${month}`);
              }
              newExclusiveLocks[month] = userId;
            }
            updates.takenExclusiveMonths = newExclusiveLocks;
          }

          if (item.isBasic) {
            updates.basicOwners = FieldValue.arrayUnion(userId);
          }

          if (Object.keys(updates).length > 0) {
            updates.territoryId = item.territoryId;
            updates.categoryValue = item.categoryValue;
            updates.updatedAt = new Date().toISOString();

            t.set(claimRefs[claimDocId]!, updates, { merge: true });
          }
        }

        // Add the updated user profile array to the transaction
        t.set(
          userRef,
          {
            activeTerritories: updatedTerritories,
            ...(session.subscription
              ? { stripeSubscriptionId: session.subscription as string }
              : {}),
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      });

      // Write the success marker to the seen document
      await seen.set({ type: stripeEvent.type, processedAt: FieldValue.serverTimestamp() });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Territory ')) {
        // Business conflict: acknowledge so Stripe stops retrying, then refund and alert.
        // This is swallowed from the caller's perspective (200 response below), so it
        // must stay logged for ops to catch and manually refund/alert on.
        // eslint-disable-next-line no-console
        console.error('Territory conflict on fulfilment', { eventId: stripeEvent.id, error });
        await queueRefundAndAlert(stripe, session, error.message);
        await seen.set({
          type: stripeEvent.type,
          outcome: 'conflict',
          processedAt: FieldValue.serverTimestamp()
        });
        return { received: true };
      }
      throw createError({ statusCode: 500, message: 'Database fulfillment failed' }); // transient: let Stripe retry
    }
  }

  return { received: true };
});
