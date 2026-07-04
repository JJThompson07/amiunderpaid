// server/api/stripe/webhook.post.ts
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';

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
      const batch = db.batch();
      let writeCount = 0;

      // GET THE USER'S CURRENT PROFILE
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data() || {};

      const existingTerritories = userData.activeTerritories || [];
      const updatedTerritories = [...existingTerritories];

      for (const item of purchasedItems) {
        // --- UPDATE 1: THE USER'S PROFILE DATA ---
        const existingIndex = updatedTerritories.findIndex(
          (t) => t.territoryId === item.territoryId && t.categoryValue === item.categoryValue
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
          const claimRef = db.collection('territory_claims').doc(claimDocId);

          const newExclusiveLocks: Record<string, string> = {};
          for (const month of item.exclusiveMonths) {
            newExclusiveLocks[month] = userId;
          }

          console.log(`📝 3. QUEUING WRITE FOR ${claimDocId}:`, newExclusiveLocks);

          batch.set(
            claimRef,
            {
              territoryId: item.territoryId,
              categoryValue: item.categoryValue,
              takenExclusiveMonths: newExclusiveLocks,
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          );
          writeCount++;
        }
      }

      // Add the updated user profile array to the batch
      batch.set(
        userRef,
        {
          activeTerritories: updatedTerritories,
          // Optional: Save the subscription ID if this was a recurring checkout
          ...(session.subscription ? { stripeSubscriptionId: session.subscription as string } : {}),
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      writeCount++;

      // COMMIT EVERYTHING AT ONCE
      await batch.commit();
      console.log(`✅ 4. SUCCESSFULLY COMMITTED ${writeCount} WRITES FOR USER ${userId}`);
    } catch (error) {
      console.error('🔥 Error fulfilling Stripe order:', error);
      throw createError({ statusCode: 500, message: 'Database fulfillment failed' });
    }
  }

  return { received: true };
});
