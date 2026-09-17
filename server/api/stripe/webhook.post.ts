import Stripe from 'stripe';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { sendBillingFailureAlert } from '~~/server/utils/billingAlerts';
import { computeTerritoryFulfillment } from '~~/server/utils/territoryFulfillment';
import type { TerritoryClaim } from '~~/shared/utils/types';

function isAlreadyExistsError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const code = (error as { code?: number | string }).code;
  return code === 6 || code === 'already-exists' || /already exists/i.test(error.message);
}

async function queueRefundAndAlert(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  reason: string,
  resendApiKey: string | undefined
): Promise<void> {
  let refundError: unknown = null;

  try {
    if (session.mode === 'payment') {
      if (!session.payment_intent) {
        throw new Error('Session has no payment_intent to refund');
      }
      await stripe.refunds.create({ payment_intent: session.payment_intent as string });
    } else if (session.subscription) {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string, {
        expand: ['latest_invoice']
      });
      const invoice = sub.latest_invoice as Stripe.Invoice | null;

      // Refund BEFORE cancelling: if the refund fails, the subscription is still
      // live, so the account is in a consistent (if wrong) state that ops can
      // finish by hand. Cancelling first and then failing to refund would leave
      // the customer with no subscription and no money back.
      if (invoice && invoice.amount_paid > 0) {
        // `Invoice.payment_intent` does not exist on this account's Stripe API
        // version (confirmed against live test-mode data) — the payment
        // reference lives on the Invoice Payments API instead.
        const payments = await stripe.invoicePayments.list({ invoice: invoice.id });
        const paymentIntentId = payments.data[0]?.payment?.payment_intent;
        if (typeof paymentIntentId === 'string') {
          await stripe.refunds.create({ payment_intent: paymentIntentId });
        } else {
          throw new Error(
            `Invoice ${invoice.id} has amount_paid > 0 but no resolvable invoice payment`
          );
        }
      }

      await stripe.subscriptions.cancel(session.subscription as string);
    } else {
      throw new Error('Session has no payment_intent or subscription to refund/cancel');
    }
  } catch (error) {
    refundError = error;
  }

  if (refundError) {
    // This is the only record of a territory conflict that fulfilment silently
    // swallows (the webhook still returns 200 so Stripe stops retrying), so it
    // must stay logged for ops to catch, in addition to the email alert above.
    // eslint-disable-next-line no-console
    console.error(
      `🚨 ALERT: Automated refund failed for session ${session.id}. Reason: ${reason}`,
      refundError
    );
    await sendBillingFailureAlert(resendApiKey, `session ${session.id}`, reason, refundError);
  }
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

    // Security Remediation: Deduplicate webhook events to prevent double processing.
    // This get() is just a fast-path short-circuit for events already fully processed;
    // the real dedup guarantee comes from the t.create() inside the transaction below.
    const seen = db.collection('stripe_events').doc(stripeEvent.id);
    if ((await seen.get()).exists) {
      return { received: true };
    }

    type FulfilmentOutcome = { conflict: false } | { conflict: true; error: Error };

    try {
      const userId = session.metadata?.userId;
      const rawCart = session.metadata?.cart;
      // A national-only confirmation checkout (see create-checkout.post.ts) has no
      // territories, so `cart` compresses to an empty string -- only require it
      // when there's no national confirmation to fall back on.
      const nationalCountry = session.metadata?.nationalCountry;

      if (!userId || (!rawCart && !nationalCountry)) {
        throw new Error('Missing metadata in Stripe session');
      }

      // UN-COMPRESS THE CART
      const purchasedItems: TerritoryClaim[] = !rawCart
        ? []
        : rawCart.split(',').map((itemStr) => {
            const [tId, catCode, hasBasic, excMonths] = itemStr.split(':');
            return {
              territoryId: Number(tId),
              categoryValue: catCode || '',
              isBasic: hasBasic === '1',
              exclusiveMonths: !excMonths || excMonths === 'none' ? [] : excMonths.split('~')
            };
          });

      const nationalStatusKey =
        nationalCountry === 'UK'
          ? 'ukNationalStatus'
          : nationalCountry === 'USA'
            ? 'usaNationalStatus'
            : null;
      // Defensive: a subscription-less recruiter (the only way to reach a
      // national-confirmation checkout) cannot hold a real local claim in the
      // target country -- every local claim requires a prior checkout, which
      // requires a subscription -- but strip any anyway rather than trust that
      // invariant blindly at write time.
      const isInNationalCountry = (territoryId: number): boolean =>
        nationalCountry === 'UK' ? territoryId < 200 : territoryId >= 200;

      const outcome: FulfilmentOutcome = await db.runTransaction(
        async (t): Promise<FulfilmentOutcome> => {
          // GET THE USER'S CURRENT PROFILE
          const userRef = db.collection('users').doc(userId);
          const userDoc = await t.get(userRef);
          const userData = userDoc.data() || {};

          const existingTerritories: TerritoryClaim[] = userData.activeTerritories || [];

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

          // Create the dedup marker as part of this same transaction, after all
          // reads (Firestore transactions require every read before any write).
          // If a concurrent delivery of this event is also mid-transaction, only
          // one commit wins; the other fails here with an "already exists" error.
          t.create(seen, {
            type: stripeEvent.type,
            status: 'processing',
            processedAt: FieldValue.serverTimestamp()
          });

          // Compute every write in memory without staging anything, so a
          // conflict partway through the cart can't leave earlier items'
          // claim writes staged for commit alongside the conflict outcome
          // below. Shared with the existing-subscription checkout path via
          // computeTerritoryFulfillment so both enforce identical conflict
          // detection.
          const computation = computeTerritoryFulfillment(
            existingTerritories,
            purchasedItems,
            claimDocs,
            userId
          );

          if (computation.conflict) {
            t.set(
              seen,
              {
                type: stripeEvent.type,
                outcome: 'conflict',
                processedAt: FieldValue.serverTimestamp()
              },
              { merge: true }
            );
            return { conflict: true, error: computation.error };
          }

          const { claimWrites } = computation;
          const updatedTerritories = nationalStatusKey
            ? computation.updatedTerritories.filter(
                (claim) => !isInNationalCountry(claim.territoryId)
              )
            : computation.updatedTerritories;

          // No conflicts anywhere in the cart, safe to stage writes.
          for (const { claimDocId, updates } of claimWrites) {
            t.set(claimRefs[claimDocId]!, updates, { merge: true });
          }

          t.set(
            userRef,
            {
              activeTerritories: updatedTerritories,
              ...(session.subscription
                ? { stripeSubscriptionId: session.subscription as string }
                : {}),
              ...(nationalStatusKey ? { [nationalStatusKey]: 'active' } : {}),
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          );

          t.set(
            seen,
            { type: stripeEvent.type, processedAt: FieldValue.serverTimestamp() },
            { merge: true }
          );

          return { conflict: false };
        }
      );

      if (outcome.conflict) {
        // This is the only record of a territory conflict that fulfilment
        // silently swallows (the webhook still returns 200 so Stripe stops
        // retrying), so it must stay logged for ops to catch.
        // eslint-disable-next-line no-console
        console.error('Territory conflict on fulfilment', {
          eventId: stripeEvent.id,
          error: outcome.error
        });
        await queueRefundAndAlert(stripe, session, outcome.error.message, config.resendApiKey);
      }

      return { received: true };
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        // Lost the race to a concurrent delivery of the same event; the other
        // delivery's transaction is committing (or already committed).
        return { received: true };
      }
      throw createError({ statusCode: 500, message: 'Database fulfillment failed' }); // transient: let Stripe retry
    }
  }

  // 5. Synchronize an out-of-band Stripe subscription deletion (Dashboard
  // deletion, repeated payment failure, etc.) back into Firestore -- see
  // design.md Decision 3. A dead subscription funds both national flags and
  // every basic territory the recruiter holds (single stripeSubscriptionId
  // per user, same reasoning as set-national.post.ts and
  // cancel-territory.post.ts), so all of it is cleared together, not just
  // stripeSubscriptionId.
  if (stripeEvent.type === 'customer.subscription.deleted') {
    const subscription = stripeEvent.data.object as Stripe.Subscription;
    const db = getFirestore();

    const seen = db.collection('stripe_events').doc(stripeEvent.id);
    if ((await seen.get()).exists) {
      return { received: true };
    }

    try {
      await db.runTransaction(async (t) => {
        // All reads before any writes -- Firestore transaction requirement.
        const usersSnap = await t.get(
          db.collection('users').where('stripeSubscriptionId', '==', subscription.id)
        );

        if (usersSnap.empty) {
          t.create(seen, {
            type: stripeEvent.type,
            outcome: 'no-matching-user',
            processedAt: FieldValue.serverTimestamp()
          });
          return;
        }

        const userDoc = usersSnap.docs[0]!;
        const userData = userDoc.data();
        const activeTerritories: TerritoryClaim[] = userData.activeTerritories || [];

        // Only basic ownership is cleaned up here -- exclusive months were
        // paid upfront and are unaffected by the recurring subscription's
        // fate, mirroring the proposal's own scope (see proposal.md item 4).
        const basicClaimRefs = activeTerritories
          .filter((claim) => claim.isBasic)
          .map((claim) =>
            db
              .collection('territory_category_owners')
              .doc(`${claim.territoryId}_${claim.categoryValue}`)
          );
        const basicClaimSnaps = basicClaimRefs.length > 0 ? await t.getAll(...basicClaimRefs) : [];

        // All reads complete -- safe to stage writes.
        t.create(seen, {
          type: stripeEvent.type,
          status: 'processing',
          processedAt: FieldValue.serverTimestamp()
        });

        // Indexed lookup into basicClaimRefs, mirroring set-national.post.ts /
        // cancel-territory.post.ts -- the mock/real snapshot's own `.ref` isn't
        // relied on, matching this file's existing claimRefs[claimDocId] pattern.
        basicClaimSnaps.forEach((snap, index) => {
          if (!snap.exists) {
            return;
          }
          const claimData = snap.data() || {};
          const basicOwners: string[] = claimData.basicOwners || [];
          if (!basicOwners.includes(userDoc.id)) {
            return;
          }
          const takenMonths: Record<string, string> = claimData.takenExclusiveMonths || {};
          const remainingBasic = basicOwners.filter((id) => id !== userDoc.id);
          const claimRef = basicClaimRefs[index]!;

          if (remainingBasic.length === 0 && Object.keys(takenMonths).length === 0) {
            t.delete(claimRef);
          } else {
            t.update(claimRef, { basicOwners: FieldValue.arrayRemove(userDoc.id) });
          }
        });

        t.set(
          userDoc.ref,
          {
            stripeSubscriptionId: null,
            ukNationalStatus: null,
            usaNationalStatus: null,
            activeTerritories: [],
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );

        t.set(
          seen,
          { type: stripeEvent.type, processedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
      });
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        // Lost the race to a concurrent delivery of the same event.
        return { received: true };
      }
      throw createError({ statusCode: 500, message: 'Database fulfillment failed' }); // transient: let Stripe retry
    }

    return { received: true };
  }

  return { received: true };
});
