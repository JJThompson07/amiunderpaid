import Stripe from 'stripe';
import { Resend } from 'resend';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { TerritoryClaim } from '~~/shared/utils/types';

const ALERT_EMAIL_TO = 'support@amiunderpaid.com';
const ALERT_EMAIL_FROM = 'alerts@amiunderpaid.com';

function isAlreadyExistsError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const code = (error as { code?: number | string }).code;
  return code === 6 || code === 'already-exists' || /already exists/i.test(error.message);
}

async function sendHumanAlert(
  resendApiKey: string | undefined,
  session: Stripe.Checkout.Session,
  reason: string,
  refundError: unknown
): Promise<void> {
  if (!resendApiKey) {
    // eslint-disable-next-line no-console
    console.error('🚨 No RESEND_API_KEY configured; refund failure was not escalated beyond logs.');
    return;
  }

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: ALERT_EMAIL_FROM,
      to: ALERT_EMAIL_TO,
      subject: `Stripe territory conflict refund failed - session ${session.id}`,
      text: [
        `A Stripe checkout session hit a territory conflict and the automated refund/cancellation did not succeed.`,
        `Session: ${session.id}`,
        `Reason: ${reason}`,
        `Refund error: ${refundError instanceof Error ? refundError.message : String(refundError)}`,
        `This customer was charged and needs a manual refund.`
      ].join('\n')
    });
  } catch (alertError) {
    // eslint-disable-next-line no-console
    console.error('Failed to send refund failure alert email', alertError);
  }
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
    await sendHumanAlert(resendApiKey, session, reason, refundError);
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

      const outcome: FulfilmentOutcome = await db.runTransaction(
        async (t): Promise<FulfilmentOutcome> => {
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

          // Create the dedup marker as part of this same transaction, after all
          // reads (Firestore transactions require every read before any write).
          // If a concurrent delivery of this event is also mid-transaction, only
          // one commit wins; the other fails here with an "already exists" error.
          t.create(seen, {
            type: stripeEvent.type,
            status: 'processing',
            processedAt: FieldValue.serverTimestamp()
          });

          // First pass: compute every write in memory without staging anything,
          // so a conflict partway through the cart can't leave earlier items'
          // claim writes staged for commit alongside the conflict outcome below.
          const claimWrites: {
            ref: FirebaseFirestore.DocumentReference;
            updates: {
              takenExclusiveMonths?: Record<string, string>;
              basicOwners?: FirebaseFirestore.FieldValue;
              territoryId?: number;
              categoryValue?: string;
              updatedAt?: string;
            };
          }[] = [];

          try {
            for (const item of purchasedItems) {
              // --- UPDATE 1: THE USER'S PROFILE DATA ---
              const existingIndex = updatedTerritories.findIndex(
                (tItem) =>
                  tItem.territoryId === item.territoryId &&
                  tItem.categoryValue === item.categoryValue
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
                claimWrites.push({ ref: claimRefs[claimDocId]!, updates });
              }
            }
          } catch (error) {
            if (error instanceof Error && error.message.startsWith('Territory ')) {
              t.set(
                seen,
                {
                  type: stripeEvent.type,
                  outcome: 'conflict',
                  processedAt: FieldValue.serverTimestamp()
                },
                { merge: true }
              );
              return { conflict: true, error };
            }
            throw error;
          }

          // Second pass: no conflicts anywhere in the cart, safe to stage writes.
          for (const { ref, updates } of claimWrites) {
            t.set(ref, updates, { merge: true });
          }

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

  return { received: true };
});
