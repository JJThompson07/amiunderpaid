## MODIFIED Requirements

### Requirement: Atomic webhook event deduplication

The system SHALL create the `stripe_events` dedup marker as part of the same Firestore transaction that performs fulfilment, so that two concurrent deliveries of the same webhook event ID cannot both pass the initial "already processed" check. All reads the fulfilment transaction performs (the user profile, the territory claim documents) SHALL be issued before any write is staged (including the dedup marker `t.create()`), since Firestore transactions require all reads to precede all writes and otherwise abort the transaction on every invocation.

#### Scenario: Stripe delivers the same event twice concurrently

- **WHEN** two deliveries of the same `checkout.session.completed` event arrive concurrently
- **THEN** at most one delivery's fulfilment transaction succeeds; the other fails on the `t.create()` dedup marker and does not duplicate the fulfilment

#### Scenario: Fulfilment transaction runs normally

- **WHEN** the webhook processes a `checkout.session.completed` event inside `db.runTransaction`
- **THEN** the user profile read and territory claim reads complete before the dedup marker or any other write is staged, so the transaction does not throw a read-after-write ordering error
