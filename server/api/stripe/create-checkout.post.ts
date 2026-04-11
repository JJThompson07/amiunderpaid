// server/api/stripe/create-checkout.post.ts
import Stripe from 'stripe';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1] || '';
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      userId = decodedToken.uid;
      userEmail = decodedToken.email || '';
    } catch (error) {
      console.warn('Stripe checkout auth warning:', error);
    }
  }

  const currency = (body.currency || 'gbp').toLowerCase();

  // ==========================================
  // 2. SECURE DATABASE PRICING FETCH
  // ==========================================
  const db = getFirestore();
  const pricingDoc = await db.collection('platform_settings').doc('pricing').get();

  if (!pricingDoc.exists) {
    console.error('Pricing document missing in Firestore!');
    return createError({ statusCode: 500, message: 'Pricing configuration not found.' });
  }

  const platformPricing = pricingDoc.data() || {};

  // Use the exact keys your admin panel saves ('UK' or 'USA')
  const countryKey = currency === 'usd' ? 'USA' : 'UK';
  const countryPricing = platformPricing[countryKey];

  if (!countryPricing) {
    console.error(`Pricing object for ${countryKey} missing in Firestore!`);
    return createError({ statusCode: 500, message: `Pricing bands for ${countryKey} not found.` });
  }

  // ==========================================
  // 3. CALCULATE TOTALS (Based on Bands)
  // ==========================================
  const territories = body.territories || [];

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
  territories.forEach((t: any) => {
    const bandData = countryPricing[`band${t.band}`];
    const basicPrice = bandData?.basic || 10;
    const exclusivePrice = bandData?.exclusive || 50;

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
  const lineItems: any[] = [];

  if (monthlyTotal > 0) {
    lineItems.push({
      price_data: {
        currency: currency,
        product_data: {
          name: 'Basic Target Access (Monthly)',
          description: `Monthly subscription for ${basicCount} target combination(s).`
        },
        unit_amount: monthlyTotal * 100, // Stripe expects pence/cents
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
        unit_amount: upfrontTotal * 100
      },
      quantity: 1
    });
  }

  if (lineItems.length === 0) {
    return createError({ statusCode: 400, message: 'No items selected in cart.' });
  }

  // ==========================================
  // 5. STRIPE METADATA COMPRESSION
  // ==========================================
  // Format: "ID:Category:BasicBoolean:ExclusiveMonthCount" (e.g. "29:IT:1:1,40:IT:1:2")
  const compressedCart = territories
    .map((t: any) => {
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

  if (monthlyTotal > 0) {
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
      mode: monthlyTotal > 0 ? 'subscription' : 'payment',

      // INJECT OUR DYNAMIC TRIAL HERE (Only valid in subscription mode)
      ...(monthlyTotal > 0 && { subscription_data: subscriptionData }),

      success_url: `${baseUrl}/recruiter/dashboard?checkout_success=true`,
      cancel_url: `${baseUrl}/recruiter/territories?checkout_cancelled=true`,
      metadata: {
        userId,
        cart: compressedCart
      }
    });

    return { url: session.url };
  } catch (error: any) {
    console.error('Stripe Error:', error.message);
    return createError({ statusCode: 500, message: error.message });
  }
});
