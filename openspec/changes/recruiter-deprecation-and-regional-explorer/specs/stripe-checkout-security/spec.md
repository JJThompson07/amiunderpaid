## REMOVED Requirements

### Requirement: Exclusive territory purchases must be transacted

**Reason**: Territory checkout, fulfilment and cancellation are removed with the recruiter product.

**Migration**: API subscriptions are governed by `api-metering-billing` ("Subscription state follows Stripe"). No live territory subscriptions exist (verified by task 1.1 before removal).

### Requirement: Server-side discount clamping

**Reason**: Territory checkout, fulfilment and cancellation are removed with the recruiter product.

**Migration**: API subscriptions are governed by `api-metering-billing` ("Subscription state follows Stripe"). No live territory subscriptions exist (verified by task 1.1 before removal).

### Requirement: Safe conflict retries

**Reason**: Territory checkout, fulfilment and cancellation are removed with the recruiter product.

**Migration**: API subscriptions are governed by `api-metering-billing` ("Subscription state follows Stripe"). No live territory subscriptions exist (verified by task 1.1 before removal).

### Requirement: A fully-discounted recurring selection still creates a real subscription

**Reason**: Territory checkout, fulfilment and cancellation are removed with the recruiter product.

**Migration**: API subscriptions are governed by `api-metering-billing` ("Subscription state follows Stripe"). No live territory subscriptions exist (verified by task 1.1 before removal).

### Requirement: Checkout fails explicitly on missing pricing configuration

**Reason**: Territory checkout, fulfilment and cancellation are removed with the recruiter product.

**Migration**: API subscriptions are governed by `api-metering-billing` ("Subscription state follows Stripe"). No live territory subscriptions exist (verified by task 1.1 before removal).

### Requirement: Resilient Checkout Creation on Missing Subscription

**Reason**: Territory checkout, fulfilment and cancellation are removed with the recruiter product.

**Migration**: API subscriptions are governed by `api-metering-billing` ("Subscription state follows Stripe"). No live territory subscriptions exist (verified by task 1.1 before removal).

### Requirement: Subscription Deletion Webhook Synchronization

**Reason**: Territory checkout, fulfilment and cancellation are removed with the recruiter product.

**Migration**: API subscriptions are governed by `api-metering-billing` ("Subscription state follows Stripe"). No live territory subscriptions exist (verified by task 1.1 before removal).

## MODIFIED Requirements

### Requirement: Atomic webhook event deduplication

The system SHALL create the `stripe_events` dedup marker as part of the same Firestore transaction that applies the event's effects, so that two concurrent deliveries of the same webhook event ID cannot both pass the initial "already processed" check. All reads the transaction performs SHALL be issued before any write is staged (including the dedup marker `t.create()`), since Firestore transactions require all reads to precede all writes.

#### Scenario: Stripe delivers the same event twice concurrently

- **WHEN** two deliveries of the same API `checkout.session.completed` event arrive concurrently
- **THEN** at most one delivery's transaction succeeds; the other fails on the `t.create()` dedup marker and its effects on `api_accounts` are not applied twice

#### Scenario: Fulfilment transaction runs normally

- **WHEN** the webhook processes an API subscription event inside `db.runTransaction`
- **THEN** every read completes before the dedup marker or any other write is staged, so the transaction does not throw a read-after-write ordering error
