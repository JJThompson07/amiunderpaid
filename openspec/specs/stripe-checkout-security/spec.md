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
