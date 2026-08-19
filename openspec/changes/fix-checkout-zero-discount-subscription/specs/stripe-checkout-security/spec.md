## ADDED Requirements

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
