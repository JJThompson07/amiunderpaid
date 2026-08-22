## ADDED Requirements

### Requirement: Checkout fails explicitly on missing pricing configuration

When calculating checkout totals, the system SHALL throw an explicit 500 error if the billing country's pricing bands, or a specific band within that country, cannot be resolved from `platform_settings/pricing`, rather than silently substituting a default price.

#### Scenario: Pricing document is missing the resolved band within the caller's billing country

- **WHEN** a checkout request resolves a territory to a band whose key is absent from the caller's country pricing
- **THEN** the endpoint returns a 500 error and does not create a Stripe checkout session

#### Scenario: Pricing document is well-formed

- **WHEN** every band a checkout request needs is present in the caller's country pricing
- **THEN** checkout totals are calculated using the real band prices, not a fallback default
