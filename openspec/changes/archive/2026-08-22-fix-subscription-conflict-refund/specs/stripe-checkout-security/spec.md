## MODIFIED Requirements

### Requirement: Safe conflict retries

The system SHALL detect Stripe webhook transaction conflicts and return 200 without throwing 500 errors, so Stripe does not retry a business conflict as if it were a transient failure. On a conflict, the system SHALL refund any funds already collected for the session, and SHALL additionally cancel the subscription where the session created one. The system SHALL raise a human-reaching alert when an automated refund that should have been issued is not. The conflict outcome SHALL be recorded on the corresponding `stripe_events` document.

#### Scenario: Webhook processes a double-booking with a one-off payment

- **WHEN** the webhook encounters a territory conflict error during the fulfilment transaction for a one-off checkout session
- **THEN** it calls `stripe.refunds.create` for the associated payment intent, records `outcome: 'conflict'` on the `stripe_events` document, logs the conflict, and returns 200 to Stripe

#### Scenario: Webhook processes a double-booking with a subscription payment

- **WHEN** the conflict occurs on a subscription checkout session whose first invoice has been paid
- **THEN** the webhook refunds that invoice's payment intent, cancels the subscription, records `outcome: 'conflict'` on the `stripe_events` document, and returns 200 to Stripe

#### Scenario: Webhook processes a double-booking with a trialling subscription

- **WHEN** the conflict occurs on a subscription checkout session whose first invoice has `amount_paid` of zero (for example a trialling subscription)
- **THEN** the webhook cancels the subscription without attempting a refund, and this is not treated as a refund failure

#### Scenario: Automated refund is not viable

- **WHEN** the refund or cancellation call itself fails
- **THEN** the system raises an alert that reaches a human within minutes, in addition to the existing log line
