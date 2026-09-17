# Spec Delta: market-data-caching

## MODIFIED Requirements

### Requirement: Fallback-provider results expire independently of the primary provider

The market-data endpoints (`server/api/market-data/jobs.ts`, `server/api/market-data/salary.ts`) SHALL cache results from a fallback provider (Adzuna when acting as UK fallback, or Jooble when acting as USA fallback) for 24 hours, regardless of the configured `cacheDays` value. Results from the regional primary provider (Reed for UK, Adzuna for USA) SHALL use the configured `cacheDays`, defaulting to 30 days.

#### Scenario: Adzuna serves the request
- **WHEN** a market-data request is fulfilled by the designated regional primary provider (Reed for UK, Adzuna for USA)
- **THEN** the cached document's `expiresAt` is set to now plus the configured `cacheDays` (default 30 days).

#### Scenario: A fallback provider serves the request
- **WHEN** a market-data request falls back to a secondary provider (Adzuna for UK, Jooble for USA)
- **THEN** the cached document's `expiresAt` is set to now plus 24 hours, independent of `cacheDays`.

#### Scenario: salary.ts does not inherit a long cache window from the jobs cache on a fallback response
- **WHEN** `salary.ts` serves a fallback-provider response and would otherwise read a per-category `cacheDays` override via the jobs cache's `categoryTag`
- **THEN** the category lookup is skipped (or `categoryTag` is forced to `'unknown'`) so the 24-hour fallback expiry is not overridden by a longer configured value.
