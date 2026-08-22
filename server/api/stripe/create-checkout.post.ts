// server/api/stripe/create-checkout.post.ts
import Stripe from 'stripe';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
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
    throw createError({ statusCode: 500, message: `Pricing bands for ${countryKey} not found.` });
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
        message: `Pricing band ${bandKey} for ${countryKey} not found.`
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
        cart: compressedCart
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
