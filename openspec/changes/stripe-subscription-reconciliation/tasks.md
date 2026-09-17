## 0. Pre-Flight: Verify Real Stripe Error Shapes

- [x] 0.1 Against this account's test-mode Stripe API (pinned version `2026-03-25.dahlia`), captured the actual `code`/`statusCode`/`message` returned by retrieve/cancel/update against a nonexistent subscription id and a real created-then-cancelled subscription. **Findings (see `design.md` Decision 0 for full detail):** `resource_missing`/404 covers retrieve-on-missing, retrieve-on-already-cancelled-again, and cancel-on-either; but `update()` on an already-cancelled subscription instead throws `code: 'invalid_canceled_subscription_fields'` (400), which the originally-guessed regexes did not match. Decision 1's helper is corrected below to check `code` against both values instead of message regexes.

## 1. Stripe Subscription Utility

- [x] 1.1 Create `server/utils/stripe.ts` with:
  - `isStripeSubscriptionMissingOrCanceled(error: unknown): boolean` to detect `statusCode === 404`, `code === 'resource_missing'`, and `code === 'invalid_canceled_subscription_fields'` (verified in task 0.1 — no message-text matching).
  - `isSubscriptionActive(sub: Stripe.Subscription | null | undefined): boolean` to check active/trialing subscription status.
- [x] 1.2 Create unit tests in `server/utils/tests/stripe.spec.ts` covering missing, canceled, active, and unexpected error scenarios with 100% test coverage.

## 2. Admin National Tier Reconciliation

- [x] 2.1 Update `server/api/admin/recruiters/set-national.post.ts`:
  - Wrap Stripe operations using `isStripeSubscriptionMissingOrCanceled`.
  - If subscription is missing or canceled in Stripe:
    - Include `stripeSubscriptionId: null` in the Firestore batch update.
    - When `active: false`: proceed with removing the national status (`ukNationalStatus` / `usaNationalStatus`) and commit without throwing an error.
    - When `active: true`: set `newStatus = 'pending'` and commit without throwing an error.
  - Rethrow unexpected Stripe errors as 500.
- [x] 2.2 Update unit tests in `server/api/admin/recruiters/tests/set-national.spec.ts`:
  - Test revoking national access when `stripe.subscriptions.retrieve` or `cancel` throws `resource_missing` / 404 (verifying `stripeSubscriptionId: null` and national status deletion).
  - Test granting national access when Stripe returns `resource_missing` (verifying status is set to `'pending'`).
  - Verify unexpected Stripe errors still throw 500.

## 3. Territory Cancellation & Checkout Resilience

- [x] 3.1 Update `server/api/stripe/cancel-territory.post.ts`:
  - Wrap Stripe operations with `isStripeSubscriptionMissingOrCanceled`.
  - If subscription is missing or canceled in Stripe, clear `stripeSubscriptionId: null` on the user doc and proceed with local territory cancellation and `territory_category_owners` cleanup.
- [x] 3.2 Update unit tests in `server/api/stripe/tests/cancel-territory.spec.ts` verifying territory cancellation succeeds and clears `stripeSubscriptionId` when Stripe throws `resource_missing`.
- [x] 3.3 Update `server/api/stripe/create-checkout.post.ts`:
  - Check `isStripeSubscriptionMissingOrCanceled` on a thrown retrieval error.
  - If the retrieval succeeds but the returned subscription's `status === 'canceled'`, treat it the same way. **Do not** invert `isSubscriptionActive` for this check (see design.md Decision 1.5) -- `past_due` / `unpaid` / `incomplete` / `paused` are still-live subscriptions, not gone, and clearing+replacing them would orphan a recoverable subscription.
  - If missing or canceled, clear `stripeSubscriptionId: null` on the user doc and fall through to creating a new checkout session.
- [x] 3.4 Update unit tests in `server/api/stripe/tests/create-checkout.spec.ts` verifying that users with dead subscription IDs fall back to creating a new Checkout Session (covering both the thrown-error and successfully-retrieved-but-canceled cases), and that a still-live `past_due` subscription is NOT treated as dead.

## 4. Webhook Subscription Deletion Synchronization

- [x] 4.1 Update `server/api/stripe/webhook.post.ts`:
  - Add event handler for `customer.subscription.deleted`.
  - Query user by `stripeSubscriptionId == subscription.id`.
  - In a Firestore transaction with event deduplication, clear `stripeSubscriptionId: null`, clear `ukNationalStatus` / `usaNationalStatus`, clear `activeTerritories` to `[]` on the user doc (mirroring `cancel-territory.post.ts`'s own-doc cleanup — the same subscription funds both national flags and basic territories, so losing it invalidates the whole array, not just the shared ownership registry), and remove this user's basic ownership from every affected `territory_category_owners` doc.
- [x] 4.2 Update unit tests in `server/api/stripe/tests/webhook.spec.ts` verifying that `customer.subscription.deleted` webhook events clear `activeTerritories` on the user doc in addition to cleaning up national flags and `territory_category_owners`.

## 5. Verification & Quality Gate

- [x] 5.1 Ran full local verification suite `pnpm test:verify`. Lint (spellcheck, typecheck, Prettier, structure-lint, check-standards, ESLint), e2e (Playwright), and Firestore rules all pass with zero errors. Coverage: all five files touched by this change (`server/utils/stripe.ts`, `server/api/admin/recruiters/set-national.post.ts`, `server/api/stripe/{cancel-territory,create-checkout,webhook}.post.ts`) clear the 80% per-file threshold on all four metrics (83-100% branch, 96-100% everything else). **Known pre-existing failure, confirmed unrelated and out of scope** (verified via `git stash` against the clean branch before this change): `server/api/market-data/tests/{jobs,salary}.spec.ts` each have one test asserting a cache-expiry timestamp that is consistently off by exactly 1 hour (3,600,000ms) on this machine -- unrelated to Stripe/subscription code, present before this change, left as-is per explicit user decision.
