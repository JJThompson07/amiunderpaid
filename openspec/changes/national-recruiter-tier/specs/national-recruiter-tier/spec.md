## Purpose
Enable administrators to grant national-level basic tier visibility to recruiters via profile-level flags, integrating seamlessly with local search queries and Stripe billing loops.

## ADDED Requirements

### Requirement: Admin National Toggling
Administrators SHALL be able to toggle National coverage for a recruiter per country, triggering symmetrical teardown of local claims and billing updates.

#### Scenario: Granting National Tier
- **GIVEN** an admin views a recruiter profile with existing local UK territory subscriptions
- **WHEN** the admin sets `isUkNational` to true
- **THEN** all existing UK territories are wiped from the recruiter's `activeTerritories` and the local owner indexes.
- **AND** the recruiter's Stripe subscription is updated to include a single Band 1 UK basic charge.

#### Scenario: Revoking National Tier
- **GIVEN** a recruiter holds `isUkNational: true`
- **WHEN** the admin revokes the flag
- **THEN** the recruiter is left with zero UK territories (must self-serve repurchase).
- **AND** the Stripe subscription reduces accordingly.

### Requirement: Global Pricing Consistency
The system SHALL accurately price national tiers during any local checkout or cancellation event.

#### Scenario: Local Checkout alongside National
- **GIVEN** a recruiter is flagged as `isUkNational: true`
- **WHEN** they purchase a local USA territory via checkout
- **THEN** the checkout session total correctly sums the new USA territory PLUS the persistent flat UK National charge.

### Requirement: Search Resolution
The system SHALL aggregate Nationally flagged recruiters into local territory searches using live profile queries.

#### Scenario: Querying with Missing Local Doc
- **GIVEN** no recruiter holds a local claim for Manchester IT
- **WHEN** a user searches IT roles in Manchester
- **THEN** the system bypasses the empty local claim doc check and successfully yields National UK IT recruiters.
