## ADDED Requirements

### Requirement: Cancellation fails explicitly on missing pricing configuration

When recalculating a recruiter's new monthly total during a territory cancellation, the system SHALL throw an explicit error if the billing country's pricing bands cannot be resolved from `platform_settings/pricing`, rather than silently substituting a default price.

#### Scenario: Pricing document is missing the caller's billing country

- **WHEN** a recruiter cancels a territory and `platform_settings/pricing` has no entry for their `billingCountry`
- **THEN** the endpoint returns a 500 error and does not update the Stripe subscription

#### Scenario: Pricing document is well-formed

- **WHEN** a recruiter cancels a territory and their billing country's pricing bands resolve correctly
- **THEN** the new monthly total is calculated from the resolved band pricing as before
