## ADDED Requirements

### Requirement: Server-side discount clamping
The system SHALL strictly bound all applied discounts between 0 and 100 on the server.

#### Scenario: User attempts negative discount
- **WHEN** a user somehow bypasses rules to set `exclusiveDiscount` to -50
- **THEN** the server clamps it to 0 before calculating the Stripe price

### Requirement: Safe conflict retries
The system SHALL detect Stripe webhook transaction conflicts and return 200 without throwing 500 errors.

#### Scenario: Webhook processes a double-booking
- **WHEN** the webhook encounters a territory conflict error during transaction
- **THEN** it refunds the customer, logs the conflict, and returns a success response to Stripe to prevent retries
