# stripe-checkout-security Specification

## Purpose

Fixes race conditions and authentication vulnerabilities in the territory purchasing flow to prevent double-selling and anonymous purchases.

## Requirements

### Requirement: Stripe checkout requires strict authentication

The system SHALL strictly require a valid Firebase authentication token to initiate a Stripe checkout session.

#### Scenario: Missing or invalid token

- **WHEN** a request without a valid token attempts to call `/api/stripe/create-checkout`
- **THEN** the system returns a 401 Unauthorized error and does not create a checkout session

#### Scenario: Valid token provided

- **WHEN** a request with a valid token calls `/api/stripe/create-checkout`
- **THEN** the system creates the checkout session using the authenticated user's ID

### Requirement: Exclusive territory purchases must be transacted

The system SHALL process webhook fulfillment for exclusive territory purchases inside a Firestore transaction to prevent double-selling the same month.

#### Scenario: Exclusive month is available

- **WHEN** the webhook receives a successful payment for an exclusive month that is not currently owned
- **THEN** the transaction succeeds and the month is assigned to the purchaser

#### Scenario: Exclusive month was purchased by someone else concurrently

- **WHEN** the webhook receives a successful payment for an exclusive month that was just assigned to a different user
- **THEN** the transaction aborts, an error is logged (e.g., `month_taken`), and the fulfillment is halted to trigger a manual review or refund

### Requirement: Server-side discount clamping

The system SHALL strictly bound all applied discounts between 0 and 100 on the server.

#### Scenario: User attempts negative discount

- **WHEN** a user somehow bypasses rules to set `exclusiveDiscount` to -50
- **THEN** the server clamps it to 0 before calculating the Stripe price

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

### Requirement: A fully-discounted recurring selection still creates a real subscription

When a recruiter's discount reduces the recurring (basic) total to $0/£0, the system SHALL still create a real Stripe subscription at that $0 price, rather than rejecting the checkout. The recurring line item and subscription mode SHALL be determined by whether a recurring commitment exists (at least one basic selection), not by whether its price is greater than zero.

#### Scenario: 100%-discounted recruiter checks out with basic selections

- **WHEN** a recruiter with `basicDiscount: 100` submits a checkout containing one or more basic territory selections and no exclusive months
- **THEN** the system creates a Stripe Checkout session in subscription mode with a $0/mo recurring line item, rather than returning "No items selected in cart"

#### Scenario: Discount is later reduced

- **WHEN** an admin reduces a previously-100%-discounted recruiter's `basicDiscount` after their $0 subscription was created
- **THEN** the existing Stripe subscription (already created by the scenario above) is available to be repriced, rather than the recruiter having no subscription to update

#### Scenario: Cart is genuinely empty

- **WHEN** a checkout request contains no basic selections and no exclusive months at all
- **THEN** the system returns "No items selected in cart" as before

#### Scenario: Fully-discounted exclusive (one-off) selection

- **WHEN** a recruiter's `exclusiveDiscount` reduces an exclusive-months total to $0 with no basic selections in the cart
- **THEN** the system returns a specific error distinct from the generic "No items selected in cart" message, since Stripe cannot process a $0 one-time payment (out of scope for this change beyond surfacing a diagnosable error — see proposal Non-Goals)

### Requirement: Atomic webhook event deduplication

The system SHALL create the `stripe_events` dedup marker as part of the same Firestore transaction that performs fulfilment, so that two concurrent deliveries of the same webhook event ID cannot both pass the initial "already processed" check. All reads the fulfilment transaction performs (the user profile, the territory claim documents) SHALL be issued before any write is staged (including the dedup marker `t.create()`), since Firestore transactions require all reads to precede all writes and otherwise abort the transaction on every invocation.

#### Scenario: Stripe delivers the same event twice concurrently

- **WHEN** two deliveries of the same `checkout.session.completed` event arrive concurrently
- **THEN** at most one delivery's fulfilment transaction succeeds; the other fails on the `t.create()` dedup marker and does not duplicate the fulfilment

#### Scenario: Fulfilment transaction runs normally

- **WHEN** the webhook processes a `checkout.session.completed` event inside `db.runTransaction`
- **THEN** the user profile read and territory claim reads complete before the dedup marker or any other write is staged, so the transaction does not throw a read-after-write ordering error

### Requirement: Checkout fails explicitly on missing pricing configuration

When calculating checkout totals, the system SHALL throw an explicit 500 error if the billing country's pricing bands, or a specific band within that country, cannot be resolved from `platform_settings/pricing`, rather than silently substituting a default price.

#### Scenario: Pricing document is missing the resolved band within the caller's billing country

- **WHEN** a checkout request resolves a territory to a band whose key is absent from the caller's country pricing
- **THEN** the endpoint returns a 500 error and does not create a Stripe checkout session

#### Scenario: Pricing document is well-formed

- **WHEN** every band a checkout request needs is present in the caller's country pricing
- **THEN** checkout totals are calculated using the real band prices, not a fallback default
