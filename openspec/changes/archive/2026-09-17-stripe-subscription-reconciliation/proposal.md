## Why

When a recruiter's Stripe subscription is cancelled or deleted out-of-band (e.g. manually deleted in the Stripe dashboard during testing, cancelled by Stripe due to repeated payment failure, or deleted by an administrator directly in Stripe), the recruiter's Firestore user document retains a stale `stripeSubscriptionId`. Subsequent administrative operations (such as revoking or toggling national tier access in `set-national.post.ts`) and recruiter self-service operations (such as territory cancellation or creating a new checkout) attempt to retrieve, cancel, or update this nonexistent subscription in Stripe. Because the Stripe API responds with a 404 `resource_missing` or invalid state error, our endpoints catch this failure and throw a generic 500 error ("Failed to update billing with Stripe"), deadlocking the user profile in Firestore and completely preventing administrators from managing the recruiter.

## What Changes

- **1. Resilient Admin National Toggling (`server/api/admin/recruiters/set-national.post.ts`)**:
  - Check whether a recruiter's `stripeSubscriptionId` is missing, deleted, or in a `canceled` status in Stripe before attempting modifications.
  - When revoking national access (`active: false`), if the Stripe subscription is missing or already canceled, clear `stripeSubscriptionId: null` in the Firestore batch write and proceed with the local national status teardown cleanly without throwing a 500 error.
  - When granting national access (`active: true`), if the Stripe subscription is missing or already canceled, clear `stripeSubscriptionId: null` and set the recruiter's national status to `'pending'` (mirroring standard subscription-less recruiters) so they can complete checkout to activate.

- **2. Resilient Territory Cancellation (`server/api/stripe/cancel-territory.post.ts`)**:
  - If a recruiter attempts to cancel a territory but their `stripeSubscriptionId` no longer exists or is canceled in Stripe, clear `stripeSubscriptionId: null` on their user document and proceed with the local territory claim removal and `territory_category_owners` cleanup rather than aborting with a 500 error.

- **3. Resilient Checkout Creation (`server/api/stripe/create-checkout.post.ts`)**:
  - If `userData.stripeSubscriptionId` is set in Firestore but `stripe.subscriptions.retrieve` returns a 404 `resource_missing` error or a subscription with `status: 'canceled'`, clear `stripeSubscriptionId: null` on the user doc and seamlessly fall through to the new-subscription Checkout Session creation flow instead of throwing a 500 error.

- **4. Stripe Webhook Listener for `customer.subscription.deleted` (`server/api/stripe/webhook.post.ts`)**:
  - Add a webhook event handler for `customer.subscription.deleted`.
  - When Stripe emits this event, query the user profile by `stripeSubscriptionId == subscription.id`, clear `stripeSubscriptionId: null`, clear active national tier flags (`ukNationalStatus: null`, `usaNationalStatus: null`), clear `activeTerritories` on the user doc, and remove active basic territory ownership from `territory_category_owners` to keep Firestore synchronized with Stripe automatically.

- **5. Shared Stripe Subscription Validation Utility (`server/utils/stripe.ts`)**:
  - Extract helper functions (`isStripeSubscriptionMissingOrCanceled`, `isSubscriptionActive`) to normalize Stripe error detection (handling `resource_missing`, 404, "No such subscription", and `status === 'canceled'`) across all billing endpoints.

### Scope & Non-Goals

- **In Scope**:
  - Pre-flight verification of Stripe's actual error shapes (code/statusCode/message) for missing and canceled subscriptions on this account's pinned API version, before writing detection logic.
  - Graceful recovery and stale ID clearing across `set-national.post.ts`, `cancel-territory.post.ts`, and `create-checkout.post.ts`.
  - Webhook handling for `customer.subscription.deleted` in `webhook.post.ts`, including clearing the user doc's own `activeTerritories` (not just `territory_category_owners`).
  - Comprehensive unit tests covering missing and canceled subscription scenarios across all affected endpoints.
- **Non-Goals**:
  - Restoring deleted Stripe subscriptions automatically without a new checkout.
  - Changing pricing band calculations or discount rules.

## Capabilities

### New Capabilities

### Modified Capabilities

- `national-recruiter-tier`: Adds resilient error recovery and stale subscription cleanup when toggling or revoking national status for recruiters with missing or canceled Stripe subscriptions.
- `territory-cancellation-integrity`: Adds graceful recovery and stale subscription cleanup during territory cancellation when a Stripe subscription is missing or canceled.
- `stripe-checkout-security`: Adds automatic recovery for stale subscription IDs during checkout creation and synchronizes subscription deletion via the `customer.subscription.deleted` webhook.

## Impact

- **Server Endpoints & Utilities**:
  - `server/utils/stripe.ts` (New)
  - `server/api/admin/recruiters/set-national.post.ts`
  - `server/api/stripe/cancel-territory.post.ts`
  - `server/api/stripe/create-checkout.post.ts`
  - `server/api/stripe/webhook.post.ts`
- **Tests**:
  - `server/utils/tests/stripe.spec.ts` (New)
  - `server/api/admin/recruiters/tests/set-national.spec.ts`
  - `server/api/stripe/tests/cancel-territory.spec.ts`
  - `server/api/stripe/tests/create-checkout.spec.ts`
  - `server/api/stripe/tests/webhook.spec.ts`
