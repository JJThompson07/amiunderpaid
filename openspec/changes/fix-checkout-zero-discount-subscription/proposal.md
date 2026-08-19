## Why

Reproduced live: a recruiter with a 100% `basicDiscount` selected UK territories, configured them for basic access, and hit checkout. The `territories` array in the request correctly contained all selected territories with `isBasic: true` (confirmed by re-checking the captured payload — an earlier read of a different attempt, where only one territory appeared, turned out to be a case where the second territory genuinely hadn't been configured yet, not a system bug). The endpoint still returned a 400 "No items selected in cart." Currency/country was also checked and ruled out separately: correcting this account's `billingCountry` to `UK` fixed the currency sent (`gbp`) but the same 400 persisted — confirming currency/pricing-table selection (which is intentionally account-driven, not territory-driven) is not the cause.

The actual cause: `server/api/stripe/create-checkout.post.ts` treats a $0 total as equivalent to an empty cart. `mode: monthlyTotal > 0 ? 'subscription' : 'payment'` (`:259`) never enters subscription mode when the recurring total is $0, and `if (monthlyTotal > 0) { lineItems.push(...) }` (`:171`) never adds the recurring line item either — so a fully-discounted recruiter with real, correctly-configured basic selections ends up with `lineItems.length === 0` and the generic "No items selected in cart" 400.

Confirmed product intent: a 100%-discounted recruiter should still get a **real Stripe subscription at $0/mo**, not be routed around Stripe entirely. If the discount is later reduced, the existing subscription needs to already exist so it can be repriced (the same `stripe.subscriptions.update` path `cancel-territory.post.ts` already uses for territory-cancellation repricing) — rather than the recruiter never having been billed because no subscription was ever created in the first place.

## What Changes

- Confirm (task 0, don't assume) that this account's `basicDiscount` is `100` and that this is the actual mechanism, before writing the fix.
- Fix the recurring (basic) line item so a $0/mo total (from a 100% `basicDiscount`) still creates a real Stripe subscription: separate "is there a recurring commitment" (`basicCount > 0`) from "is the recurring price > 0" — push the monthly line item and use `mode: 'subscription'` whenever `basicCount > 0`, regardless of whether `monthlyTotal` is exactly zero. Stripe supports a `recurring` price with `unit_amount: 0`.
- For the one-off exclusive-months charge specifically: Stripe does not support a $0 one-time `PaymentIntent`, so a fully-discounted exclusive purchase can't go through Stripe the same way. Scope this as its own decision point (see Non-Goals) rather than guessing a workaround.
- Only when there is truly nothing selected (no basic, no exclusive months at all) should the endpoint still 400 with "No items selected in cart" — that message should no longer fire for a real, configured, fully-discounted cart.

## Scope

`server/api/stripe/create-checkout.post.ts` and its test suite.

## Non-Goals

- Anything to do with currency or pricing-table selection by country — confirmed working as intended, out of scope for this change.
- Cart-completeness validation between Step 1 and Step 2 of the territory-claim UI — checked and not a system bug; the earlier appearance of a dropped territory was a genuine user-configuration miss, not a code defect.
- Rebuilding the discount system or the pricing admin panel.
- Deciding how a fully-discounted **exclusive** (one-off) purchase should be handled — Stripe can't process a $0 one-time payment, so this needs a separate product decision (e.g. block 100% exclusive discounts, or grant the month via a non-Stripe admin path) rather than being folded into this fix.

## Capabilities

### Modified Capabilities

- `stripe-checkout-security`: adds a requirement that a fully-discounted recurring (basic) selection still creates a real $0/mo Stripe subscription rather than 400ing.

## Impact

- **Affected code:** `server/api/stripe/create-checkout.post.ts`, plus its test suite.
- **User-facing effect:** a 100%-discounted recruiter successfully checks out into a real $0/mo subscription instead of hitting a generic 400.
