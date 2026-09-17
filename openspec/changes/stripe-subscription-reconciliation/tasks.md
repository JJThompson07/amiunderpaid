## 0. Pre-Flight: Verify Real Stripe Error Shapes

- [ ] 0.1 Against this account's test-mode Stripe API (pinned version `2026-03-25.dahlia`), capture the actual `code`/`statusCode`/`message` returned by:
  - `stripe.subscriptions.retrieve()` on a subscription hard-deleted via the Dashboard.
  - `stripe.subscriptions.retrieve()` on a subscription cancelled (soft-delete, `status: 'canceled'`) via `stripe.subscriptions.cancel()` or non-payment.
  - `stripe.subscriptions.cancel()` and `stripe.subscriptions.update()` called against each of the above.
  - Confirm or correct the assumed detection logic in Decision 1 of `design.md` (the `resource_missing` code and the `/already canceled/i` / `/cannot update a canceled subscription/i` message regexes) against what Stripe actually returns, before writing `isStripeSubscriptionMissingOrCanceled`. This repo has previously shipped a proposal whose unverified Stripe API assumption (`invoice.payment_intent`) didn't hold on this account's pinned version — verify first.

## 1. Stripe Subscription Utility

- [ ] 1.1 Create `server/utils/stripe.ts` with:
  - `isStripeSubscriptionMissingOrCanceled(error: unknown): boolean` to detect 404, `resource_missing`, "No such subscription", and cancellation error messages.
  - `isSubscriptionActive(sub: Stripe.Subscription | null | undefined): boolean` to check active/trialing subscription status.
- [ ] 1.2 Create unit tests in `server/utils/tests/stripe.spec.ts` covering missing, canceled, active, and unexpected error scenarios with 100% test coverage.

## 2. Admin National Tier Reconciliation

- [ ] 2.1 Update `server/api/admin/recruiters/set-national.post.ts`:
  - Wrap Stripe operations using `isStripeSubscriptionMissingOrCanceled`.
  - If subscription is missing or canceled in Stripe:
    - Include `stripeSubscriptionId: null` in the Firestore batch update.
    - When `active: false`: proceed with removing the national status (`ukNationalStatus` / `usaNationalStatus`) and commit without throwing an error.
    - When `active: true`: set `newStatus = 'pending'` and commit without throwing an error.
  - Rethrow unexpected Stripe errors as 500.
- [ ] 2.2 Update unit tests in `server/api/admin/recruiters/tests/set-national.spec.ts`:
  - Test revoking national access when `stripe.subscriptions.retrieve` or `cancel` throws `resource_missing` / 404 (verifying `stripeSubscriptionId: null` and national status deletion).
  - Test granting national access when Stripe returns `resource_missing` (verifying status is set to `'pending'`).
  - Verify unexpected Stripe errors still throw 500.

## 3. Territory Cancellation & Checkout Resilience

- [ ] 3.1 Update `server/api/stripe/cancel-territory.post.ts`:
  - Wrap Stripe operations with `isStripeSubscriptionMissingOrCanceled`.
  - If subscription is missing or canceled in Stripe, clear `stripeSubscriptionId: null` on the user doc and proceed with local territory cancellation and `territory_category_owners` cleanup.
- [ ] 3.2 Update unit tests in `server/api/stripe/tests/cancel-territory.spec.ts` verifying territory cancellation succeeds and clears `stripeSubscriptionId` when Stripe throws `resource_missing`.
- [ ] 3.3 Update `server/api/stripe/create-checkout.post.ts`:
  - Check `isStripeSubscriptionMissingOrCanceled` and `isSubscriptionActive` when retrieving `existingSubscriptionId`.
  - If missing or canceled, clear `stripeSubscriptionId: null` on the user doc and fall through to creating a new checkout session.
- [ ] 3.4 Update unit tests in `server/api/stripe/tests/create-checkout.spec.ts` verifying that users with dead subscription IDs fall back to creating a new Checkout Session.

## 4. Webhook Subscription Deletion Synchronization

- [ ] 4.1 Update `server/api/stripe/webhook.post.ts`:
  - Add event handler for `customer.subscription.deleted`.
  - Query user by `stripeSubscriptionId == subscription.id`.
  - In a Firestore transaction with event deduplication, clear `stripeSubscriptionId: null`, clear `ukNationalStatus` / `usaNationalStatus`, clear `activeTerritories` to `[]` on the user doc (mirroring `cancel-territory.post.ts`'s own-doc cleanup — the same subscription funds both national flags and basic territories, so losing it invalidates the whole array, not just the shared ownership registry), and remove this user's basic ownership from every affected `territory_category_owners` doc.
- [ ] 4.2 Update unit tests in `server/api/stripe/tests/webhook.spec.ts` verifying that `customer.subscription.deleted` webhook events clear `activeTerritories` on the user doc in addition to cleaning up national flags and `territory_category_owners`.

## 5. Verification & Quality Gate

- [ ] 5.1 Run full local verification suite `pnpm test:verify` (combines linting, typechecking, 80% per-file test coverage, e2e tests, and firestore rules tests) and verify all checks pass with zero errors.
