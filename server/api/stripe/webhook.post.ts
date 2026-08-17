import Stripe from 'stripe';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

async function queueRefundAndAlert(stripe: Stripe, session: Stripe.Checkout.Session, reason: string) {
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
  } catch (err: any) {
    console.error('⚠️ Webhook signature verification failed.', err.message);
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

      console.log('🔍 1. RAW CART FROM STRIPE:', rawCart);

      // UN-COMPRESS THE CART
      const purchasedItems = rawCart.split(',').map((itemStr) => {
        const [tId, catCode, hasBasic, excMonths] = itemStr.split(':');
        return {
          territoryId: Number(tId),
          categoryValue: catCode,
          isBasic: hasBasic === '1',
          exclusiveMonths: !excMonths || excMonths === 'none' ? [] : excMonths.split('~')
        };
      });

      console.log('🔍 2. PARSED ITEMS:', JSON.stringify(purchasedItems, null, 2));

      const db = getFirestore();

      await db.runTransaction(async (t) => {
        // GET THE USER'S CURRENT PROFILE
        const userRef = db.collection('users').doc(userId);
        const userDoc = await t.get(userRef);
        const userData = userDoc.data() || {};

        const existingTerritories = userData.activeTerritories || [];
        const updatedTerritories = [...existingTerritories];

        // PRE-FETCH ALL CLAIM DOCUMENTS
        const claimRefs: Record<string, any> = {};
        const claimDocs: Record<string, any> = {};
        for (const item of purchasedItems) {
          if (item.exclusiveMonths && item.exclusiveMonths.length > 0) {
            const claimDocId = `${item.territoryId}_${item.categoryValue}`;
            if (!claimRefs[claimDocId]) {
              claimRefs[claimDocId] = db.collection('territory_claims').doc(claimDocId);
            }
          }
        }

        const refsArray = Object.values(claimRefs);
        if (refsArray.length > 0) {
          const snapshots = await t.getAll(...refsArray);
          snapshots.forEach(snap => {
            claimDocs[snap.id] = snap.exists ? snap.data() : null;
          });
        }

        for (const item of purchasedItems) {
          // --- UPDATE 1: THE USER'S PROFILE DATA ---
          const existingIndex = updatedTerritories.findIndex(
            (tItem) => tItem.territoryId === item.territoryId && tItem.categoryValue === item.categoryValue
          );

          if (existingIndex > -1) {
            // Upgrade existing territory
            updatedTerritories[existingIndex].isBasic =
              item.isBasic || updatedTerritories[existingIndex].isBasic;
            const combinedMonths = new Set([
              ...(updatedTerritories[existingIndex].exclusiveMonths || []),
              ...item.exclusiveMonths
            ]);
            updatedTerritories[existingIndex].exclusiveMonths = Array.from(combinedMonths);
          } else {
            // Brand new territory
            updatedTerritories.push(item);
          }

          // --- UPDATE 2: THE GLOBAL LOCK ---
          if (item.exclusiveMonths && item.exclusiveMonths.length > 0) {
            const claimDocId = `${item.territoryId}_${item.categoryValue}`;
            const existingClaimData = claimDocs[claimDocId] || {};
            const takenMonths = existingClaimData.takenExclusiveMonths || {};

            const newExclusiveLocks: Record<string, string> = {};
            for (const month of item.exclusiveMonths) {
              if (takenMonths[month] && takenMonths[month] !== userId) {
                throw new Error(`Territory ${claimDocId} is already taken for month ${month}`);
              }
              newExclusiveLocks[month] = userId;
            }

            console.log(`📝 3. QUEUING TRANSACTION WRITE FOR ${claimDocId}:`, newExclusiveLocks);

            t.set(
              claimRefs[claimDocId],
              {
                territoryId: item.territoryId,
                categoryValue: item.categoryValue,
                takenExclusiveMonths: newExclusiveLocks,
                updatedAt: new Date().toISOString()
              },
              { merge: true }
            );
          }
        }

        // Add the updated user profile array to the transaction
        t.set(
          userRef,
          {
            activeTerritories: updatedTerritories,
            ...(session.subscription ? { stripeSubscriptionId: session.subscription as string } : {}),
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      });

      // Write the success marker to the seen document
      await seen.set({ type: stripeEvent.type, processedAt: FieldValue.serverTimestamp() });
      console.log(`✅ 4. SUCCESSFULLY COMMITTED TRANSACTION FOR USER ${userId}`);
    } catch (error: any) {
      if (error instanceof Error && error.message.startsWith('Territory ')) {
        // Business conflict: acknowledge so Stripe stops retrying, then refund and alert.
        console.error('Territory conflict on fulfilment', { eventId: stripeEvent.id, error });
        await queueRefundAndAlert(stripe, session, error.message);
        await seen.set({ type: stripeEvent.type, outcome: 'conflict', processedAt: FieldValue.serverTimestamp() });
        return { received: true };
      }
      console.error('🔥 Error fulfilling Stripe order:', error);
      throw createError({ statusCode: 500, message: 'Database fulfillment failed' }); // transient: let Stripe retry
    }
  }

  return { received: true };
});
