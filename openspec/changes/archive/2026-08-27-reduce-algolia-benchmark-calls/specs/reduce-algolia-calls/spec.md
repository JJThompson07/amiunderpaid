## Purpose

Eliminate verified Algolia query redundancies in the data-fetching layer by threading pre-fetched identity hits to downstream composables and skipping regional lookups when no target location is requested.

## MODIFIED Requirements

### Requirement: Skip Redundant National Benchmark Fetch

The system SHALL reuse an already-fetched national benchmark record to avoid duplicate database queries.

#### Scenario: USA Identity Resolution

- **GIVEN** `useMarketData` successfully searched the `salary_benchmarks` index to resolve an identity
- **WHEN** `useMicroData` requests the national micro-baseline
- **THEN** it must use the prefetched hit rather than executing a new `search()` command for the exact same `id_code`.

#### Scenario: Dictionary Match or Bypass Path

- **GIVEN** `useMarketData` resolved identity via the dictionary (UK) or via an exact ID bypass
- **WHEN** `useMicroData` requests the national micro-baseline
- **THEN** `useMarketData` must provide `null` for the prefetched hit, and `useMicroData` must correctly execute its own fallback `search()` command.

### Requirement: Prevent Wasteful Regional Queries

The system SHALL NOT execute regional data queries if the user's current request contains no location.

#### Scenario: National-only Data Request

- **WHEN** `useMacroData` or `useMicroData` is invoked with a falsy `location` string
- **THEN** the internal regional Algolia query is completely skipped (resolved as an empty array) instead of querying for 1000 records.
