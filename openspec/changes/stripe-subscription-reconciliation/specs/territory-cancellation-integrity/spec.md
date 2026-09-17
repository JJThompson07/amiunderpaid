## ADDED Requirements

### Requirement: Resilient Territory Cancellation on Missing Subscription

When a recruiter cancels a territory and their `stripeSubscriptionId` no longer exists or is canceled in Stripe, the system SHALL clear the stale `stripeSubscriptionId` from their user profile and proceed with removing the local territory claim from `activeTerritories` and `territory_category_owners` without failing with an unhandled Stripe error.

#### Scenario: Recruiter cancels territory with missing Stripe subscription
- **GIVEN** a recruiter has a territory in `activeTerritories` and a `stripeSubscriptionId` that has been deleted in Stripe
- **WHEN** the recruiter cancels the territory
- **THEN** the system SHALL remove the territory from `activeTerritories`, release exclusive month locks from `territory_category_owners`, clear `stripeSubscriptionId: null`, and return success.
