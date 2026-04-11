// server/api/stripe/webhook.post.ts
import Stripe from 'stripe';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2026-03-25.dahlia'
  });

  // Stripe requires the raw, unparsed body to verify the cryptographic signature
  const body = await readRawBody(event);
  const sig = getRequestHeader(event, 'stripe-signature');

  // You will get this secret from the Stripe Dashboard (or Stripe CLI for local testing)
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    if (!body || !sig || !endpointSecret) throw new Error('Missing webhook requirements');
    stripeEvent = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`⚠️  Webhook signature verification failed:`, err.message);
    return createError({ statusCode: 400, message: `Webhook Error: ${err.message}` });
  }

  // ==========================================
  // HANDLE SUCCESSFUL PAYMENTS
  // ==========================================
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;

    // 1. Unpack our secure passport!
    const userId = session.metadata?.userId;
    const compressedCart = session.metadata?.cart;

    // 2. Grab the Stripe IDs we need for future downgrades/cancellations
    const stripeCustomerId = session.customer as string;
    const stripeSubscriptionId = session.subscription as string | null;

    if (!userId || userId === 'anonymous') {
      console.error('Webhook Error: No userId found in metadata.');
      return { received: true };
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);

    // 3. Decode the cart string ("29:IT:1:2,40:IT:1:0")
    const newTerritories = compressedCart
      ? compressedCart.split(',').map((item) => {
          const [territoryId, categoryValue, isBasicStr, excMonthsStr] = item.split(':');

          // Split the tilde-separated string back into a beautiful array of exact months!
          const exclusiveMonths = excMonthsStr === 'none' ? [] : (excMonthsStr || '').split('~');

          return {
            territoryId: Number(territoryId),
            categoryValue,
            isBasic: isBasicStr === '1',
            exclusiveMonths: exclusiveMonths, // <-- Now contains the exact dates!
            purchasedAt: new Date().toISOString()
          };
        })
      : [];

    // 4. Update the user in Firebase
    try {
      await userRef.set(
        {
          // Save their Stripe IDs so we can use them later
          stripeCustomerId: stripeCustomerId,
          ...(stripeSubscriptionId && { stripeSubscriptionId: stripeSubscriptionId }),

          // Add the new territories to their account using an array union
          // (so we don't overwrite any they bought previously!)
          activeTerritories: FieldValue.arrayUnion(...newTerritories),

          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      console.log(`✅ Successfully provisioned territories for user: ${userId}`);
    } catch (error) {
      console.error('🔥 Failed to update Firebase user document:', error);
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  return { received: true };
});
