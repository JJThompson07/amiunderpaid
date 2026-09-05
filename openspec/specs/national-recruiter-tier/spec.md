## Purpose

Enable administrators to grant national-level basic tier visibility to recruiters via a per-country status field, integrating seamlessly with local search queries and Stripe billing loops.

## Requirements

### Requirement: Admin National Toggling

Administrators SHALL be able to toggle National coverage for a recruiter per country (`ukNationalStatus` / `usaNationalStatus`, each `'pending' | 'active'`), triggering symmetrical teardown of local claims and billing updates once coverage is actually paid for.

#### Scenario: Granting National Tier to a Recruiter With an Existing Subscription

- **GIVEN** an admin views a recruiter profile with an existing Stripe subscription and existing local UK territory subscriptions
- **WHEN** the admin grants UK National coverage
- **THEN** the recruiter's `ukNationalStatus` is set to `'active'`
- **AND** all existing UK territories are wiped from the recruiter's `activeTerritories` and the local owner indexes (`territory_category_owners`), removing only this recruiter's ownership from any shared claim doc
- **AND** the recruiter's Stripe subscription is updated to include a single flat Band 1 UK basic charge.

#### Scenario: Granting National Tier to a Recruiter With No Existing Subscription

- **GIVEN** an admin views a recruiter profile with no `stripeSubscriptionId`
- **WHEN** the admin grants National coverage for a country
- **THEN** the recruiter's status for that country is set to `'pending'`, with no Stripe call and no local-claim wipe
- **AND** confirmation to `'active'` (and any wipe) happens later, once the recruiter completes checkout, via the Stripe webhook.

#### Scenario: Revoking National Tier

- **GIVEN** a recruiter holds an `'active'` national status for a country
- **WHEN** the admin revokes it
- **THEN** the status field for that country is cleared and the recruiter is left with zero territories in that country (must self-serve repurchase)
- **AND** the Stripe subscription reduces accordingly.

### Requirement: Global Pricing Consistency

The system SHALL accurately price national tiers during any local checkout or cancellation event. National coverage is billed as a single flat Band 1 basic charge per `'active'` national status held — never per-territory, and never for a `'pending'` (unpaid) status.

#### Scenario: Local Checkout alongside National

- **GIVEN** a recruiter holds `ukNationalStatus: 'active'`
- **WHEN** they purchase a local USA territory via checkout
- **THEN** the checkout session total correctly sums the new USA territory PLUS the persistent flat UK National charge.

### Requirement: Search Resolution

The system SHALL surface recruiters with an `'active'` national status (`ukNationalStatus` / `usaNationalStatus`, keyed by whether the search's territory or country is UK vs. USA) into search results by merging them with any local territory claim owners, using a live profile query.

#### Scenario: Querying with No Local Claim Doc

- **GIVEN** no recruiter holds a local claim for Manchester IT, and a recruiter holds `ukNationalStatus: 'active'` and covers IT
- **WHEN** a user searches IT roles in Manchester
- **THEN** the system bypasses the empty local claim doc and successfully yields the National UK IT recruiter.

#### Scenario: Search Location Does Not Resolve to a Known Territory

- **GIVEN** a recruiter holds `ukNationalStatus: 'active'` and covers IT
- **WHEN** a user searches IT roles in a UK location whose display name matches neither a territory's own name nor any of its `ons_matches` entries (e.g. a broad region/nation name like "Scotland", or an unlisted town)
- **THEN** the system still yields the National UK IT recruiter, by falling back to a country-wide national query (skipping the local claim-doc lookup, since no specific territory was resolved) instead of returning an empty result.

### Requirement: Local Purchase Restriction While Nationally Covered

A recruiter with an `'active'` national status for a country SHALL NOT be able to purchase local Basic coverage again in that country (redundant spend), but MAY still purchase Exclusive months on individual territories there, since National coverage does not include Exclusive.
