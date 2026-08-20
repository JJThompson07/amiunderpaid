# Manual follow-up checklist

All code and tests for this change are done and merged (tasks 0, 1, 2, 3.2,
3.3 in `tasks.md`; 326/326 tests pass). What's left needs a human — tracked
here so the change can be archived without losing them.

## Live verification (task 3.1)

- [ ] When the first live 100%-discount recruiter signs up: in the Stripe
      Dashboard (live mode), confirm a real subscription was created for them
      at $0.00/mo (Customers → their subscriptions) — not a one-time payment,
      and not "no subscription."

## Known gap surfaced by this change, not fixed here

- [ ] `server/api/admin/recruiters/discount.post.ts` only writes `basicDiscount`/`exclusiveDiscount` to the Firestore user document — it never calls `stripe.subscriptions.update`. So today, reducing a recruiter's discount in the admin panel does **not** reprice their live Stripe subscription, even though this change's spec (`stripe-checkout-security`, "Discount is later reduced" scenario) assumes the existing subscription is "available to be repriced." Needs its own openspec change: wire `discount.post.ts` to reprice the recruiter's `stripeSubscriptionId` (same `stripe.subscriptions.update` pattern `cancel-territory.post.ts` already uses) whenever `basicDiscount` changes on an account with a $0-priced basic subscription.
