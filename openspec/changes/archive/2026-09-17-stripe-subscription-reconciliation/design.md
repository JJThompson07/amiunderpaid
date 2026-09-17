## Context

`server/api/admin/recruiters/set-national.post.ts`, `server/api/stripe/cancel-territory.post.ts`, and `server/api/stripe/create-checkout.post.ts` assume that any recruiter with a non-null `userData.stripeSubscriptionId` in Firestore possesses a live, active subscription in Stripe.

If a subscription is deleted directly in the Stripe Dashboard, cancelled due to repeated card failures, or removed out-of-band:

1. `stripe.subscriptions.retrieve(stripeSubId)` fails with a 404 `resource_missing` error or returns a subscription with `status: 'canceled'`.
2. `stripe.subscriptions.cancel(stripeSubId)` or `stripe.subscriptions.update(stripeSubId, ...)` fails with `resource_missing` or `invalid_request_error`.
3. The endpoints catch this error and throw a generic 500 error (`createError({ statusCode: 500, message: 'Failed to update billing with Stripe.' })`).
4. Because the error is thrown before committing Firestore writes, the user's Firestore document cannot be updated: national status cannot be revoked, territories cannot be cancelled, and new checkouts cannot be created.

## Goals / Non-Goals

**Goals:**

- Create a shared utility `server/utils/stripe.ts` with error-classification helpers (`isStripeSubscriptionMissingOrCanceled`, `isSubscriptionActive`) to accurately distinguish permanent missing/canceled subscription states from transient network failures.
- In `server/api/admin/recruiters/set-national.post.ts`:
  - When revoking national access (`active: false`) on a recruiter whose Stripe subscription is missing or canceled, clear `stripeSubscriptionId: null` in the Firestore batch write and complete the national status revocation without throwing a 500 error.
  - When granting national access (`active: true`) on a recruiter whose Stripe subscription is missing or canceled, clear `stripeSubscriptionId: null` and assign `newStatus = 'pending'` so they can pay via checkout.
- In `server/api/stripe/cancel-territory.post.ts`:
  - When cancelling a territory for a user whose Stripe subscription is missing or canceled, clear `stripeSubscriptionId: null` and proceed with removing the local territory claim and releasing locks from `territory_category_owners`.
- In `server/api/stripe/create-checkout.post.ts`:
  - If `userData.stripeSubscriptionId` fails retrieval with `resource_missing` or is in `canceled` status, clear `stripeSubscriptionId: null` and fall through to the new-subscription Checkout Session creation path.
- In `server/api/stripe/webhook.post.ts`:
  - Add a handler for `customer.subscription.deleted` to automatically synchronize out-of-band Stripe cancellations with Firestore.

**Non-Goals:**

- Auto-recreating deleted Stripe subscriptions without a checkout session.
- Altering pricing band calculations or discount percentages.

## Decisions

### 0. Pre-Flight: Verify Stripe's Actual Error Shapes Before Writing Detection Logic

- **Decision**: Before implementing `isStripeSubscriptionMissingOrCanceled`, run the scenarios below against this account's test-mode Stripe API on the pinned version (`2026-03-25.dahlia`) and record the real `code`/`statusCode`/`message`, correcting Decision 1 if it doesn't match.
- **Verified findings (test-mode, `2026-03-25.dahlia`, real customer/price/subscription lifecycle — a fabricated `sub_doesnotexist...` id AND a genuinely-created-then-canceled subscription were both tested)**:
  - `retrieve()` on a nonexistent subscription id → throws `code: 'resource_missing'`, `statusCode: 404`, `message: "No such subscription: '...'"`.
  - `retrieve()` on a real subscription that has been cancelled (`status: 'canceled'`) → **does NOT throw** — returns the subscription object normally with `status: 'canceled'`. Detection here must be a status check (`isSubscriptionActive`), not error handling.
  - `cancel()` on a nonexistent id, or a second time on an already-cancelled real subscription → throws the _same_ `resource_missing` / 404 / "No such subscription" shape as a truly nonexistent id. Already covered by the `resource_missing` check.
  - `update()` on an already-cancelled real subscription → throws `code: 'invalid_canceled_subscription_fields'`, `statusCode: 400`, `message: "A canceled subscription can only update its cancellation_details and metadata."` — **this does not match `resource_missing`, 404, or either of the originally-guessed regexes** (`/already canceled/i`, `/cannot update a canceled subscription/i` — neither is a substring of the real message). Without correcting Decision 1, `set-national.post.ts`'s repricing path (`stripe.subscriptions.update`, hit whenever a recruiter keeps other territories after a change) would still rethrow this as an unhandled 500 — the exact bug this change exists to fix.
- **Rationale**: Decision 1's original `resource_missing` code and message regexes were unverified assumptions about external API behavior, and testing found one of them wrong in a way that would have shipped a real gap in the `update()` path. This repo has already been burned once by an unverified Stripe API assumption on this same pinned version (`invoice.payment_intent` not existing — see `fix-subscription-conflict-refund`); CODE_STANDARDS.md §10 and AGENTS.md's Verify-Don't-Guess Rule require confirming infrastructure-specific behavior before, not during, implementation.

### 1. Centralized Stripe Error Classification Helper (`server/utils/stripe.ts`)

- **Decision**: Centralize Stripe subscription state inspection in a utility module:
  ```typescript
  import type Stripe from 'stripe';

  export function isStripeSubscriptionMissingOrCanceled(error: unknown): boolean {
    if (!error) return false;
    const status = (error as { statusCode?: number }).statusCode;
    const code = (error as { code?: string }).code;

    // Verified against this account's test-mode API on the pinned version
    // (2026-03-25.dahlia): retrieve/cancel/update on a subscription that
    // doesn't exist (or was already cancelled and re-cancelled) surfaces as
    // `resource_missing` / 404. Updating an already-cancelled subscription
    // surfaces as a distinct `invalid_canceled_subscription_fields` / 400 --
    // it does NOT come back as resource_missing, so it needs its own check.
    // Message-text matching was tried and dropped: the real update() message
    // ("A canceled subscription can only update its cancellation_details and
    // metadata.") doesn't contain "already canceled" or "cannot update a
    // canceled subscription", so regexing for those strings silently misses
    // this case -- match on `code` only.
    return (
      status === 404 ||
      code === 'resource_missing' ||
      code === 'invalid_canceled_subscription_fields'
    );
  }

  export function isSubscriptionActive(sub: Stripe.Subscription | null | undefined): boolean {
    if (!sub) return false;
    return sub.status === 'active' || sub.status === 'trialing';
  }
  ```
- **Rationale**: Prevents code duplication across `set-national.post.ts`, `cancel-territory.post.ts`, `create-checkout.post.ts`, and `webhook.post.ts` while ensuring consistent behavior and dedicated unit testing.

### 1.5 `create-checkout.post.ts`'s "dead subscription" check is narrower than `isSubscriptionActive`

- **Decision**: When `existingSubscriptionId` retrieves successfully (no thrown error) but the returned object isn't billable, only treat `status === 'canceled'` (the literal wording of this change's Goals/spec text) as "gone -- clear and fall through to a new Checkout Session." Do NOT invert `isSubscriptionActive()` (i.e. do not treat every non-`active`/`trialing` status the same way).
- **Rationale**: Stripe subscription statuses also include `past_due`, `unpaid`, `incomplete`, and `paused` -- all still-live objects mid-dunning or mid-setup, not gone. `isSubscriptionActive()` returning `false` for these is correct for other call sites (e.g. deciding whether a flag is currently billed), but inverting it here would clear `stripeSubscriptionId` and route the recruiter through brand-new Checkout Session creation while their original (recoverable) subscription is still live in Stripe -- creating exactly the silently-orphaned duplicate subscription this file's own "3.5 EXISTING SUBSCRIPTION" comment already warns about. `isSubscriptionActive` stays exported for other call sites; it is intentionally not used for this specific check.

### 2. Resilient Handling in `set-national.post.ts`

- **Decision**: Wrap the Stripe interaction in `set-national.post.ts`:
  - If `stripeSubId` is present:
    - Attempt retrieval/cancellation/update.
    - If `isStripeSubscriptionMissingOrCanceled(error)` returns `true`:
      - Set a flag `shouldClearStripeSub = true`.
      - If `active === false`: Treat Stripe as successfully reconciled (since no subscription exists to cancel/update) and do NOT throw.
      - If `active === true`: Treat as a subscription-less recruiter (`newStatus = 'pending'`).
    - If it is a real unexpected error (e.g. Stripe 500 or rate limit 429), rethrow the 500 error as before.
  - In the Firestore batch commit:
    - Include `{ stripeSubscriptionId: null }` if `shouldClearStripeSub` is true.
- **Rationale**: Admins are never locked out of revoking permissions due to an out-of-band Stripe deletion.

### 3. Automatic Webhook Synchronization for `customer.subscription.deleted`

- **Decision**: Add `customer.subscription.deleted` to `server/api/stripe/webhook.post.ts`:
  - Extract `subscription.id`.
  - Locate user by `stripeSubscriptionId == subscription.id`. (No `stripeCustomerId` fallback: grepping the codebase confirms no user doc is ever written with a `stripeCustomerId` field, so that fallback doesn't exist as a queryable path — if the primary lookup finds no user, the event is a no-op.)
  - Atomically update user profile: clear `stripeSubscriptionId: null`, `ukNationalStatus: null`, `usaNationalStatus: null`, and `activeTerritories: []`.
  - Clean up this user's basic ownership entries in `territory_category_owners`.
- **Rationale**: Keeps Firestore and Stripe synchronized in real time when subscriptions are deleted via the Stripe Dashboard or due to non-payment. `activeTerritories` is cleared alongside the national flags — not just `territory_category_owners` — because the same single subscription funds both national access and every basic territory claim (see `set-national.post.ts` and `cancel-territory.post.ts`'s existing handling); leaving `activeTerritories` stale would keep showing the recruiter's own dashboard (`app/pages/recruiter/dashboard.vue`) and territories page as if they still held those claims.

## Risks / Trade-offs

- **[Risk: Real billing errors silenced]** → _Mitigation_: Only the two verified codes (`resource_missing` / 404, and `invalid_canceled_subscription_fields` / 400) trigger recovery. All other Stripe API errors (other 400s, 401 auth, 429 rate limit, 500 server error) continue to throw and block execution.
- **[Risk: Webhook double-execution]** → _Mitigation_: The existing deduplication document (`db.collection('stripe_events').doc(stripeEvent.id)`) is created and checked within the Firestore transaction.
