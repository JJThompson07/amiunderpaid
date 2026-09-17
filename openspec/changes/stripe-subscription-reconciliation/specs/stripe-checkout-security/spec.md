## ADDED Requirements

### Requirement: Resilient Checkout Creation on Missing Subscription

When `/api/stripe/create-checkout` is invoked for a user whose `stripeSubscriptionId` in Firestore has been deleted or canceled in Stripe, the system SHALL clear the stale `stripeSubscriptionId` from the user document and fall back to creating a new-subscription Checkout Session rather than failing with a 500 error.

#### Scenario: User creates checkout after out-of-band subscription deletion

- **GIVEN** a user has a `stripeSubscriptionId` in Firestore that is deleted or in `canceled` status in Stripe
- **WHEN** the user initiates checkout for territories
- **THEN** the system SHALL clear `stripeSubscriptionId: null` on the user doc and generate a new Stripe Checkout Session URL.

### Requirement: Subscription Deletion Webhook Synchronization

The Stripe webhook handler (`server/api/stripe/webhook.post.ts`) SHALL process `customer.subscription.deleted` events to synchronize subscription cancellations initiated in Stripe with Firestore state.

#### Scenario: Subscription deleted in Stripe dashboard

- **WHEN** Stripe delivers a `customer.subscription.deleted` webhook event
- **THEN** the system SHALL find the matching user profile, clear `stripeSubscriptionId: null`, clear `ukNationalStatus` and `usaNationalStatus`, clear `activeTerritories` on the user doc, and remove that user's basic ownership from `territory_category_owners`.
