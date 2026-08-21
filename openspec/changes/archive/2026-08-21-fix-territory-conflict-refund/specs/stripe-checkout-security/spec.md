## MODIFIED Requirements

### Requirement: Safe conflict retries

The system SHALL detect Stripe webhook transaction conflicts and return 200 without throwing 500 errors, so Stripe does not retry a business conflict as if it were a transient failure. On a conflict, the system SHALL issue an automated refund (or subscription cancellation) where the payment shape supports it, and SHALL raise a human-reaching alert when an automated refund is not issued. The conflict outcome SHALL be recorded on the corresponding `stripe_events` document.

#### Scenario: Webhook processes a double-booking with a one-off payment

- **WHEN** the webhook encounters a territory conflict error during the fulfilment transaction for a one-off checkout session
- **THEN** it calls `stripe.refunds.create` for the associated payment intent, records `outcome: 'conflict'` on the `stripe_events` document, logs the conflict, and returns 200 to Stripe

#### Scenario: Webhook processes a double-booking with a subscription payment

- **WHEN** the conflict occurs on a subscription checkout session
- **THEN** the webhook cancels the associated subscription, records `outcome: 'conflict'` on the `stripe_events` document, and returns 200 to Stripe

#### Scenario: Automated refund is not viable

- **WHEN** the refund or cancellation call itself fails
- **THEN** the system raises an alert that reaches a human within minutes, in addition to the existing log line

## ADDED Requirements

### Requirement: Atomic webhook event deduplication

The system SHALL create the `stripe_events` dedup marker as part of the same Firestore transaction that performs fulfilment, so that two concurrent deliveries of the same webhook event ID cannot both pass the initial "already processed" check.

#### Scenario: Stripe delivers the same event twice concurrently

- **WHEN** two deliveries of the same `checkout.session.completed` event arrive concurrently
- **THEN** at most one delivery's fulfilment transaction succeeds; the other fails on the `t.create()` dedup marker and does not duplicate the fulfilment
