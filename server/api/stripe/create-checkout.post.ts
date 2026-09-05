// server/api/stripe/create-checkout.post.ts
import Stripe from 'stripe';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { sendBillingFailureAlert } from '~~/server/utils/billingAlerts';
import { computeTerritoryFulfillment } from '~~/server/utils/territoryFulfillment';
import { RECRUITER_TERRITORIES_UK } from '~~/utils/locations/uk';
import { RECRUITER_TERRITORIES_USA } from '~~/utils/locations/usa';
import type { TerritoryClaim } from '~~/shared/utils/types';

// The `platform_settings/pricing` Firestore doc keys bands dynamically
// (`band${1-5}`), so this stays index-signature based rather than reusing
// the client-side `CountryPricingBands` type from app/composables/usePricing.ts.
type PricingBand = { basic: number; exclusive: number };
type CountryPricingBands = Record<string, PricingBand>;
type PricingByCountry = Record<string, CountryPricingBands>;

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const config = useRuntimeConfig();

  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2026-03-25.dahlia'
  });

  // ==========================================
  // 1. VERIFY USER
  // ==========================================
  const authHeader = getRequestHeader(event, 'authorization');
  let userId = 'anonymous';
  let userEmail = '';

  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized: Missing auth token' });
  }

  const token = authHeader.split('Bearer ')[1] || '';
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    userId = decodedToken.uid;
    userEmail = decodedToken.email || '';
  } catch (error) {
    // eslint-disable-next-line no-console -- surfaces token-verification failures for debugging; no dedicated server-side error-logging utility exists
    console.warn('Stripe checkout auth warning:', error);
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized: Invalid token' });
  }

  const currency = (body.currency || 'gbp').toLowerCase();

  // ==========================================
  // 2. SECURE DATABASE PRICING FETCH
  // ==========================================
  const db = getFirestore();
  const pricingDoc = await db.collection('platform_settings').doc('pricing').get();

  const DEFAULT_PRICING: PricingByCountry = {
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

  // Firestore documents are inherently untyped (any) — this cast reflects that
  // the admin panel (usePricing.ts) is the sole writer and always saves this shape.
  const platformPricing: PricingByCountry = pricingDoc.exists
    ? (pricingDoc.data() as PricingByCountry | undefined) || {}
    : DEFAULT_PRICING;

  // Use the exact keys your admin panel saves ('UK' or 'USA')
  const countryKey = currency === 'usd' ? 'USA' : 'UK';
  const countryPricing = platformPricing[countryKey];

  if (!countryPricing) {
    // eslint-disable-next-line no-console -- surfaces missing pricing configuration for debugging; no dedicated server-side error-logging utility exists
    console.error(`Pricing object for ${countryKey} missing in Firestore!`);
    throw createError({ statusCode: 500, message: 'Failed to process pricing.' });
  }

  // ==========================================
  // 2.5 FETCH USER DISCOUNTS
  // ==========================================
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data() || {};

  // Security Remediation: Clamp discounts so they can't be set > 100 or negative via client-side manipulation.
  const clampPercent = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
  };
  const basicDiscount = clampPercent(userData.basicDiscount);
  const exclusiveDiscount = clampPercent(userData.exclusiveDiscount);

  // National confirmation: a recruiter with a 'pending' grant for THIS checkout's
  // own country (matching currency/countryKey) is confirming it here -- see
  // shared/utils/types.ts's NationalStatus and set-national.post.ts. Only the
  // matching country is ever folded into a single checkout (a recruiter with both
  // countries pending confirms them one at a time, each in its own currency).
  const thisCountryStatusKey = countryKey === 'UK' ? 'ukNationalStatus' : 'usaNationalStatus';
  const isConfirmingNational = userData[thisCountryStatusKey] === 'pending';

  // ==========================================
  // 3. CALCULATE TOTALS (Based on Bands)
  // ==========================================
  const territories = body.territories || [];

  // Combine all territories to act as our server-side source of truth
  const allTerritories = [...RECRUITER_TERRITORIES_UK, ...RECRUITER_TERRITORIES_USA];

  let monthlyTotal = 0;
  let upfrontTotal = 0;
  let basicCount = 0;
  let exclusiveMonthsTotal = 0;

  // Replicate the frontend's date logic for the 50% halfway discount
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isPastHalfway =
    now.getDate() > new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() / 2;

  // Loop through every item in the user's cart
  territories.forEach((t: TerritoryClaim) => {
    // SERVER-SIDE BAND LOOKUP: Don't trust the client payload for the band!
    const foundTerritory = allTerritories.find((tt) => tt.id === t.territoryId);
    const safeBand = foundTerritory ? foundTerritory.band || 1 : 1;

    const bandKey = `band${safeBand}`;
    const bandData = countryPricing[bandKey];
    if (!bandData) {
      throw createError({
        statusCode: 500,
        message: 'Failed to process pricing.'
      });
    }
    let basicPrice = bandData.basic;
    let exclusivePrice = bandData.exclusive;

    // Apply custom recruiter discounts
    basicPrice = Math.max(0, basicPrice * (1 - basicDiscount / 100));
    exclusivePrice = Math.max(0, exclusivePrice * (1 - exclusiveDiscount / 100));

    // 1. Add Basic Subscription Cost
    if (t.isBasic) {
      monthlyTotal += basicPrice;
      basicCount++;
    }

    // 2. Add Exclusive Upfront Cost
    if (t.exclusiveMonths && Array.isArray(t.exclusiveMonths)) {
      // Calculate the universal base upgrade cost
      const baseUpgradeCost = t.isBasic ? exclusivePrice - basicPrice : exclusivePrice;

      t.exclusiveMonths.forEach((monthStr: string) => {
        const isFirstMonth = monthStr === currentMonthStr;
        let monthUpgradeCost = baseUpgradeCost;

        // Apply the 50% halfway discount ONLY to the current first month
        if (isFirstMonth && isPastHalfway) {
          monthUpgradeCost = monthUpgradeCost / 2;
        }

        upfrontTotal += monthUpgradeCost;
        exclusiveMonthsTotal++;
      });
    }
  });

  // Fold the flat Band 1 national charge into the same recurring total as any
  // territories in the cart -- applies uniformly to both the existing-subscription
  // branch below (which recomputes its own grand total independently and ignores
  // monthlyTotal, but shares this basicCount bump so its empty-cart guard doesn't
  // fire for a national-only confirmation) and the new-Checkout-Session branch
  // further down (which uses monthlyTotal/basicCount directly).
  if (isConfirmingNational) {
    const band1Data = countryPricing.band1;
    if (!band1Data) {
      throw createError({
        statusCode: 500,
        message: 'Failed to process pricing.'
      });
    }
    monthlyTotal += Math.max(0, band1Data.basic * (1 - basicDiscount / 100));
    basicCount += 1;
  }

  // ==========================================
  // 3.5 EXISTING SUBSCRIPTION: UPDATE IN PLACE, DON'T CREATE A SECOND ONE
  // ==========================================
  // `customer_email` below does not reuse an existing Stripe Customer the way
  // passing `customer:` (an ID) would -- a recruiter who already has a live
  // subscription must never be routed through Checkout Session creation
  // again, or their first subscription is silently orphaned (still billing,
  // no longer referenced anywhere) while a second one is created alongside it.
  const existingSubscriptionId: string | undefined = userData.stripeSubscriptionId;

  if (existingSubscriptionId) {
    if (basicCount === 0 && upfrontTotal === 0) {
      if (exclusiveMonthsTotal > 0) {
        throw createError({
          statusCode: 400,
          message: 'Exclusive month pricing resolved to zero and cannot be processed as-is.'
        });
      }
      throw createError({ statusCode: 400, message: 'No items selected in cart.' });
    }

    let subscription: Stripe.Subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(existingSubscriptionId);
    } catch {
      throw createError({
        statusCode: 500,
        message: 'Failed to load existing billing subscription.'
      });
    }
    const customerId = subscription.customer as string;

    // Pre-check for exclusive-month conflicts before charging anything.
    const claimDocIds = Array.from(
      new Set(
        territories.map((t: TerritoryClaim) => `${t.territoryId}_${t.categoryValue || 'ALL'}`)
      )
    ) as string[];
    const claimDocsData: Record<string, FirebaseFirestore.DocumentData | null> = {};
    await Promise.all(
      claimDocIds.map(async (claimDocId) => {
        const snap = await db.collection('territory_category_owners').doc(claimDocId).get();
        claimDocsData[claimDocId] = snap.exists ? (snap.data() ?? null) : null;
      })
    );

    const existingTerritories: TerritoryClaim[] = userData.activeTerritories || [];
    const preCheck = computeTerritoryFulfillment(
      existingTerritories,
      territories,
      claimDocsData,
      userId
    );

    if (preCheck.conflict) {
      throw createError({
        statusCode: 409,
        message:
          'One or more selected exclusive months are no longer available. Please refresh and try again.'
      });
    }

    // Recompute the GRAND total recurring price across every basic territory
    // the recruiter will hold after this purchase (existing + new), mirroring
    // cancel-territory.post.ts's banded pricing/discount logic. Re-resolve the
    // band from the static territory lists for every entry rather than
    // trusting a stored `band` field, same as the cart-only loop above.
    const resolveBandData = (territoryId: number): PricingBand => {
      const foundTerritory = allTerritories.find((tt) => tt.id === territoryId);
      const safeBand = foundTerritory ? foundTerritory.band || 1 : 1;
      const bandKey = `band${safeBand}`;
      const bandData = countryPricing[bandKey];
      if (!bandData) {
        throw createError({
          statusCode: 500,
          message: 'Failed to process pricing.'
        });
      }
      return bandData;
    };

    let grandMonthlyTotal = 0;
    preCheck.updatedTerritories.forEach((t: TerritoryClaim) => {
      if (!t.isBasic) {
        return;
      }
      grandMonthlyTotal += Math.max(
        0,
        resolveBandData(t.territoryId).basic * (1 - basicDiscount / 100)
      );
    });

    // Count every BILLED national flag this recruiter will hold after this
    // checkout: the other country if already 'active', THIS country if already
    // 'active' (a normal repeat purchase by a nationally-active recruiter), or
    // THIS country if it's the 'pending' grant being confirmed right now
    // (isConfirmingNational, computed above from the checkout's own countryKey).
    // 'pending' on the OTHER country never counts here -- it isn't billed until
    // confirmed through its own checkout.
    const otherCountryStatusKey = countryKey === 'UK' ? 'usaNationalStatus' : 'ukNationalStatus';
    const otherCountryAlreadyActive = userData[otherCountryStatusKey] === 'active';
    const thisCountryAlreadyActive = userData[thisCountryStatusKey] === 'active';
    const totalNationalFlags =
      (thisCountryAlreadyActive ? 1 : 0) +
      (isConfirmingNational ? 1 : 0) +
      (otherCountryAlreadyActive ? 1 : 0);
    if (totalNationalFlags > 0) {
      const band1Data = countryPricing.band1;
      if (!band1Data) {
        throw createError({
          statusCode: 500,
          message: 'Failed to process pricing.'
        });
      }
      grandMonthlyTotal +=
        Math.max(0, band1Data.basic * (1 - basicDiscount / 100)) * totalNationalFlags;
    }

    let paidInvoiceId: string | null = null;
    let subscriptionUpdated = false;
    const currentItem = subscription.items.data[0];
    try {
      await stripe.subscriptions.update(existingSubscriptionId, {
        items: [
          {
            id: currentItem?.id,
            price_data: {
              currency,
              product: currentItem?.price.product as string,
              recurring: { interval: 'month' },
              unit_amount: Math.round(grandMonthlyTotal * 100)
            }
          }
        ],
        proration_behavior: 'none'
      });
      subscriptionUpdated = true;

      if (upfrontTotal > 0) {
        await stripe.invoiceItems.create({
          customer: customerId,
          amount: Math.round(upfrontTotal * 100),
          currency,
          description: `${exclusiveMonthsTotal} exclusive month(s) secured across your territories.`
        });

        // Verified against this account's live test-mode API: without
        // `pending_invoice_items_behavior: 'include'`, the created invoice
        // does NOT auto-attach the pending invoice item above -- it comes
        // back with 0 line items and a $0 total, which then finalizes as
        // trivially "paid" with nothing actually charged.
        const invoice = await stripe.invoices.create({
          customer: customerId,
          collection_method: 'charge_automatically',
          auto_advance: false,
          pending_invoice_items_behavior: 'include'
        });

        // Verified against this account's live test-mode API (not just the
        // generic docs): with `collection_method: 'charge_automatically'` and
        // a default payment method on file, `finalizeInvoice` already charges
        // the invoice synchronously and returns it as `paid` -- calling `pay`
        // on an already-paid invoice throws "Invoice is already paid". Only
        // fall back to an explicit `pay` call if finalization left it unpaid
        // (e.g. no default payment method yet), so this stays correct even if
        // that behavior ever differs.
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id as string);
        const paidInvoice =
          finalizedInvoice.status === 'paid'
            ? finalizedInvoice
            : await stripe.invoices.pay(invoice.id as string);

        if (paidInvoice.status !== 'paid') {
          throw new Error(
            `Invoice ${invoice.id} did not settle synchronously (status: ${paidInvoice.status})`
          );
        }
        paidInvoiceId = invoice.id as string;
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- surfaces Stripe billing failures for debugging; no dedicated server-side error-logging utility exists
      console.error('Stripe existing-subscription billing error:', error);

      // The recurring line item was already repriced above before the upfront
      // invoice failed -- revert it so a declined card never leaves the
      // recruiter permanently upgraded to the higher recurring tier without
      // actually receiving the territories.
      if (subscriptionUpdated) {
        try {
          await stripe.subscriptions.update(existingSubscriptionId, {
            items: [
              {
                id: currentItem?.id,
                price_data: {
                  currency,
                  product: currentItem?.price.product as string,
                  recurring: { interval: 'month' },
                  unit_amount: currentItem?.price.unit_amount ?? 0
                }
              }
            ],
            proration_behavior: 'none'
          });
        } catch (revertError) {
          const reason = error instanceof Error ? error.message : String(error);
          // eslint-disable-next-line no-console
          console.error(
            `🚨 ALERT: Automated subscription-tier reversal failed for user ${userId}. Reason: ${reason}`,
            revertError
          );
          await sendBillingFailureAlert(config.resendApiKey, `user ${userId}`, reason, revertError);
        }
      }

      throw createError({
        statusCode: 500,
        message: 'Failed to process payment for this purchase.'
      });
    }

    // Stripe billing succeeded -- now safe to commit the Firestore
    // fulfillment, with a final in-transaction conflict re-check. Charging
    // first and fulfilling second is this repo's existing accepted risk
    // model for the Checkout+webhook path too (see webhook.post.ts), so this
    // isn't a new risk class.
    const userRef = db.collection('users').doc(userId);
    try {
      await db.runTransaction(async (t) => {
        const freshUserDoc = await t.get(userRef);
        const freshUserData = freshUserDoc.data() || {};
        const freshExistingTerritories: TerritoryClaim[] = freshUserData.activeTerritories || [];

        const claimRefs: Record<string, FirebaseFirestore.DocumentReference> = {};
        for (const claimDocId of claimDocIds) {
          claimRefs[claimDocId] = db.collection('territory_category_owners').doc(claimDocId);
        }
        // A national-only confirmation has no territories, so claimDocIds is
        // empty here -- the real @google-cloud/firestore SDK throws
        // "Transaction.getAll() requires at least 1 argument" when called
        // with zero refs, so this must be skipped rather than called blindly.
        const freshClaimDocsData: Record<string, FirebaseFirestore.DocumentData | null> = {};
        const claimRefsArray = Object.values(claimRefs);
        if (claimRefsArray.length > 0) {
          const freshSnapshots = await t.getAll(...claimRefsArray);
          freshSnapshots.forEach((snap) => {
            freshClaimDocsData[snap.id] = snap.exists ? (snap.data() ?? null) : null;
          });
        }

        const freshComputation = computeTerritoryFulfillment(
          freshExistingTerritories,
          territories,
          freshClaimDocsData,
          userId
        );

        if (freshComputation.conflict) {
          throw freshComputation.error;
        }

        for (const { claimDocId, updates } of freshComputation.claimWrites) {
          t.set(claimRefs[claimDocId]!, updates, { merge: true });
        }

        t.set(
          userRef,
          {
            activeTerritories: freshComputation.updatedTerritories,
            ...(isConfirmingNational ? { [thisCountryStatusKey]: 'active' } : {}),
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      });
    } catch (error) {
      // A concurrent purchase claimed the same exclusive month between our
      // pre-check and this commit. The customer was already charged/repriced
      // above -- reverse it and alert ops, mirroring webhook.post.ts's
      // queueRefundAndAlert pattern for the equivalent risk on that path.
      let reversalError: unknown = null;
      try {
        if (paidInvoiceId) {
          const payments = await stripe.invoicePayments.list({ invoice: paidInvoiceId });
          const paymentIntentId = payments.data[0]?.payment?.payment_intent;
          if (typeof paymentIntentId === 'string') {
            await stripe.refunds.create({ payment_intent: paymentIntentId });
          } else {
            throw new Error(`Invoice ${paidInvoiceId} has no resolvable invoice payment to refund`);
          }
        }
        // Revert the recurring line item back to its pre-purchase total.
        const revertItem = subscription.items.data[0];
        await stripe.subscriptions.update(existingSubscriptionId, {
          items: [
            {
              id: revertItem?.id,
              price_data: {
                currency,
                product: revertItem?.price.product as string,
                recurring: { interval: 'month' },
                unit_amount: revertItem?.price.unit_amount ?? 0
              }
            }
          ],
          proration_behavior: 'none'
        });
      } catch (err) {
        reversalError = err;
      }

      const reason = error instanceof Error ? error.message : String(error);
      if (reversalError) {
        // eslint-disable-next-line no-console
        console.error(
          `🚨 ALERT: Automated reversal failed for user ${userId}. Reason: ${reason}`,
          reversalError
        );
        await sendBillingFailureAlert(config.resendApiKey, `user ${userId}`, reason, reversalError);
      }

      throw createError({
        statusCode: 409,
        message:
          'One or more selected exclusive months became unavailable during checkout. Any charge has been refunded and will not be billed further.'
      });
    }

    return { url: null };
  }

  // ==========================================
  // 4. BUILD STRIPE LINE ITEMS
  // ==========================================
  // Indexed access instead of `Stripe.Checkout.SessionCreateParams.LineItem` — the
  // top-level `Checkout` namespace only re-exports `SessionCreateParams` as a type
  // alias, which drops the nested `LineItem` namespace member from that alias's name.
  type StripeCheckoutLineItem = NonNullable<
    Stripe.Checkout.SessionCreateParams['line_items']
  >[number];
  const lineItems: StripeCheckoutLineItem[] = [];

  if (basicCount > 0) {
    // basicCount, not monthlyTotal: a 100% basicDiscount legitimately zeroes the
    // price, but the recruiter still needs a real $0/mo subscription so a later
    // discount change can reprice an existing subscription rather than starting
    // from no billing relationship at all.
    lineItems.push({
      price_data: {
        currency: currency,
        product_data: {
          name: 'Basic Target Access (Monthly)',
          description: `Monthly subscription for ${basicCount} target combination(s).`
        },
        unit_amount: Math.round(monthlyTotal * 100), // Stripe expects pence/cents
        recurring: { interval: 'month' }
      },
      quantity: 1
    });
  }

  if (upfrontTotal > 0) {
    lineItems.push({
      price_data: {
        currency: currency,
        product_data: {
          name: 'Exclusive Target Access (Upfront)',
          description: `${exclusiveMonthsTotal} exclusive months secured across your territories.`
        },
        unit_amount: Math.round(upfrontTotal * 100)
      },
      quantity: 1
    });
  }

  if (lineItems.length === 0) {
    // Distinguish a genuinely empty cart from exclusive months that were selected
    // but priced to zero by a 100% exclusiveDiscount — Stripe can't process a $0
    // one-time payment, so this needs its own handling rather than the generic
    // "empty cart" message (see fix-checkout-zero-discount-subscription Non-Goals).
    if (exclusiveMonthsTotal > 0) {
      throw createError({
        statusCode: 400,
        message: 'Exclusive month pricing resolved to zero and cannot be processed as-is.'
      });
    }
    throw createError({ statusCode: 400, message: 'No items selected in cart.' });
  }

  // ==========================================
  // 5. STRIPE METADATA COMPRESSION
  // ==========================================
  // Format: "ID:Category:BasicBoolean:ExclusiveMonthCount" (e.g. "29:IT:1:1,40:IT:1:2")
  const compressedCart = territories
    .map((t: TerritoryClaim) => {
      // Remove the .substring(0, 4) so we keep the full category code!
      const catCode = t.categoryValue || 'ALL';
      const hasBasic = t.isBasic ? '1' : '0';

      const excMonths =
        t.exclusiveMonths && t.exclusiveMonths.length > 0 ? t.exclusiveMonths.join('~') : 'none';

      return `${t.territoryId}:${catCode}:${hasBasic}:${excMonths}`;
    })
    .join(',');

  // ==========================================
  // 6. DYNAMIC MULTI-TENANT URL ROUTING
  // ==========================================
  const protocol = getRequestProtocol(event);
  const host = getRequestHost(event);
  const baseUrl = `${protocol}://${host}`;

  // ==========================================
  // 7. CALENDAR-AWARE FREE TRIAL (End of Month)
  // ==========================================
  let subscriptionData = undefined;

  if (basicCount > 0 && monthlyTotal > 0) {
    // A $0 subscription (100% basicDiscount) has no meaningful trial to grant —
    // it starts billing at $0 immediately.
    const now = new Date();
    // Get the 1st day of the NEXT calendar month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    let trialEndUnix = Math.floor(nextMonth.getTime() / 1000);

    const currentUnix = Math.floor(now.getTime() / 1000);

    // Stripe safety check: trial_end MUST be > 48 hours (172,800 seconds) in the future
    if (trialEndUnix - currentUnix < 172800) {
      // If they sign up on the very last day of the month, we just give them
      // the upcoming month for free too to satisfy Stripe's rule.
      const nextNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 1);
      trialEndUnix = Math.floor(nextNextMonth.getTime() / 1000);
    }

    subscriptionData = {
      trial_end: trialEndUnix
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: lineItems,
      // basicCount, not monthlyTotal: a recurring commitment (even at $0, from a
      // 100% basicDiscount) still needs subscription mode to create a real
      // subscription object.
      mode: basicCount > 0 ? 'subscription' : 'payment',

      // INJECT OUR DYNAMIC TRIAL HERE (Only valid in subscription mode)
      ...(basicCount > 0 && monthlyTotal > 0 && { subscription_data: subscriptionData }),

      success_url: `${baseUrl}/recruiter/dashboard?checkout_success=true`,
      cancel_url: `${baseUrl}/recruiter/territories?checkout_cancelled=true`,
      metadata: {
        userId,
        cart: compressedCart,
        ...(isConfirmingNational ? { nationalCountry: countryKey } : {})
      }
    });

    return { url: session.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session.';
    // eslint-disable-next-line no-console -- surfaces Stripe checkout failures for debugging; no dedicated server-side error-logging utility exists
    console.error('Stripe Error:', message);
    throw createError({ statusCode: 500, message });
  }
});
