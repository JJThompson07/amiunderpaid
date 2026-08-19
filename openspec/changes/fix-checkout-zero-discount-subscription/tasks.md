## 0. Confirm the discount (verify before fixing)

- [ ] 0.1 Check `basicDiscount` on the reproducing account's `users/{uid}` document and confirm it is `100`. With currency confirmed correct and a fully-populated `territories` array confirmed in the request, this is the remaining explanation — confirm the exact value before writing the fix in section 1, rather than assuming.

## 1. $0 recurring total still creates a real subscription

- [ ] 1.1 In `server/api/stripe/create-checkout.post.ts`, change the monthly line-item and mode logic to key off `basicCount > 0` rather than `monthlyTotal > 0`: push the `Basic Target Access (Monthly)` line item (with `unit_amount: Math.round(monthlyTotal * 100)`, which may legitimately be `0`) whenever `basicCount > 0`, and set `mode: (basicCount > 0 || upfrontTotal > 0) ? 'subscription' : 'payment'`.
- [ ] 1.2 Confirm the trial-end logic (`:229-252`, gated on `monthlyTotal > 0`) still makes sense for a $0 subscription — a free trial period is presumably moot when the recurring price is already $0; gate it on `basicCount > 0 && monthlyTotal > 0` instead so a genuinely $0 subscription starts billing (at $0) immediately rather than getting a trial it doesn't need.
- [ ] 1.3 Only throw "No items selected in cart" when there is truly nothing configured (`basicCount === 0 && upfrontTotal === 0` and no exclusive months). Add a unit test asserting a `basicDiscount: 100` account with a basic selection creates a subscription-mode session with a $0 line item, not a 400.
- [ ] 1.4 Explicitly leave the fully-discounted **exclusive** (one-off) case out of this fix (Stripe can't process a $0 one-time payment) — if `upfrontTotal === 0` but `exclusiveMonthsTotal > 0` (months were selected but priced to zero), throw a specific error distinct from the generic "no items" message so it's diagnosable, and file a follow-up ticket for how that case should actually be handled.

## 2. Tests

- [ ] 2.1 Add server-side unit tests in `server/api/stripe/tests/create-checkout.spec.ts` covering: a `basicDiscount: 100` account with basic selections successfully creating a $0/mo subscription-mode session, a genuinely empty cart still 400ing with the generic message, and the fully-discounted-exclusive-only case getting the distinct diagnosable error from task 1.4.

## 3. Verification

- [ ] 3.1 Manually verify a `basicDiscount: 100` account can complete checkout into a real $0/mo Stripe subscription (test mode), and that increasing the discount back down later correctly reprices that same subscription via the existing subscription-update path (`cancel-territory.post.ts`'s pattern).
- [ ] 3.2 Manually reproduce the original scenario (multiple UK territories, 100% basic discount, all configured) and confirm checkout now succeeds.
- [ ] 3.3 Run local verification `pnpm vitest run`.
