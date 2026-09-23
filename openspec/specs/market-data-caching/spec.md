# market-data-caching Specification

## Purpose

Defines cache-expiry behavior for the market-data endpoints (`server/api/market-data/jobs.ts`, `server/api/market-data/salary.ts`) as a function of which provider actually served the response.

## Requirements

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

### Requirement: Cache Key Versioning & Stale Provider Invalidation

The market-data cache layer SHALL prefix cache keys with a version identifier (`v2-`) and invalidate mismatched provider entries on read so that previously cached Adzuna entries for UK searches are automatically bypassed and refreshed upon deployment without requiring manual database deletion.

#### Scenario: Versioned cache key generation

- **WHEN** `generateCacheKey` is invoked for a search query
- **THEN** it SHALL prefix the resulting key with `v2-`, isolating fresh search results from legacy unversioned cache entries.

#### Scenario: Invalidation of stale UK provider entries

- **WHEN** a UK market-data request (`country: gb`) reads a cached document where `provider !== 'reed'`
- **THEN** the system SHALL treat the entry as a cache miss, immediately fetch fresh data from the Reed API, and overwrite the cached document.

### Requirement: Automated Background Cache Purging

The system SHALL provide a dedicated background cron endpoint (`GET /api/cron/clean-cache`) that periodically purges expired documents from `adzuna_jobs_cache` and `adzuna_distribution_cache`. The endpoint MUST authenticate requests against the private `CRON_SECRET` runtime configuration using a timing-safe constant-time comparison (`timingSafeEqual`). If `CRON_SECRET` is missing or misconfigured on the server, the endpoint MUST fail closed with a 500 status code. Batch deletions MUST be executed in chunks of at most 500 documents per Firestore commit. When `RESEND_API_KEY` is configured in runtimeConfig, the endpoint SHALL email summary reports and crash alerts to administrators, matching the unattended cron pattern in `sync-trends.get.ts`.

#### Scenario: Scheduled background cron executes cache purge with valid credentials

- **WHEN** a scheduled cron job sends a GET request to `/api/cron/clean-cache` with an `Authorization: Bearer <token>` header matching `CRON_SECRET`
- **THEN** the system deletes all expired entries from `adzuna_jobs_cache` and `adzuna_distribution_cache` where `expiresAt < now` (and legacy entries where `timestamp < (now - 120 days)`)
- **AND** sends a summary email via Resend if configured
- **AND** returns a 200 OK response with a breakdown of deleted document counts.

#### Scenario: Background cron execution with invalid or missing credentials

- **WHEN** a request is sent to `/api/cron/clean-cache` without an Authorization header or with an invalid token
- **THEN** the system rejects the request with a 401 Unauthorized status code without performing any deletions.

#### Scenario: Background cron execution when secret is unconfigured

- **WHEN** a request is sent to `/api/cron/clean-cache` but `CRON_SECRET` is not set in the server's runtime configuration
- **THEN** the system fails closed with a 500 error and an opaque error message.

#### Scenario: Background cron crash notification

- **WHEN** an unhandled error occurs during unattended cron execution
- **THEN** the system attempts to send a crash notification email via Resend (if configured) and re-throws the error.

### Requirement: Per-category cache duration is sourced from a single canonical collection and document ID

The market-data endpoints (`server/api/market-data/jobs.ts`, `server/api/market-data/salary.ts`) SHALL read the per-category `cacheDays` override from the `adzuna_categories` collection, using a document ID of `${countryLabel}-${categoryTag}` (lowercased, where `countryLabel` is `UK` or `USA`) — matching exactly the collection and document ID that the admin category-management UI (`/admin/adzuna`) writes. No code path SHALL read a per-category `cacheDays` override from any other collection name or an un-prefixed document ID.

#### Scenario: Primary-provider path resolves an admin-configured override

- **WHEN** a market-data request is fulfilled by the regional primary provider (Reed for UK, Adzuna for USA) for a category with a matching `{countryLabel}-{categoryTag}` document in `adzuna_categories`
- **THEN** the cached document's `expiresAt` is set to now plus that category document's `cache` field value, not the hardcoded 30-day default.

#### Scenario: The same category tag in different countries resolves independent overrides

- **WHEN** a category tag exists as both a UK document (`uk-{tag}`) and a USA document (`usa-{tag}`) in `adzuna_categories` with different `cache` values
- **THEN** a UK market-data request resolves only the `uk-{tag}` document's `cache` value, and a USA request resolves only the `usa-{tag}` document's `cache` value.

#### Scenario: Legacy pre-expiresAt fallback path resolves the same collection and document ID

- **WHEN** the system evaluates a legacy cached document that predates the `expiresAt` field and needs to look up a per-category override
- **THEN** it queries the same `adzuna_categories` collection and `${countryLabel}-${categoryTag}` document ID format used by the primary-provider path and the admin UI.

### Requirement: Saving a category's cache duration retroactively re-expires already-cached documents

WHEN an admin updates a category's `cache` value via `/admin/adzuna` and saves it, the system SHALL, in addition to persisting the new value on the category document, recompute `expiresAt` on already-cached documents in `adzuna_jobs_cache` and `adzuna_distribution_cache` that match that category's tag AND country, so that previously-cached results reflect the new duration without waiting for a natural cache miss to refresh them. Updates SHALL be scoped to the edited category's own country (Reed/UK categories SHALL NOT affect Adzuna/USA-cached documents sharing the same category tag, and vice versa) and SHALL be committed in batches of at most 500 documents per Firestore commit, consistent with the batching convention used by the existing cache-purge cron job.

#### Scenario: Admin lowers a UK category's cache duration

- **WHEN** an admin changes a UK category's `cache` value from 30 to 1 and saves
- **THEN** all `adzuna_jobs_cache` and `adzuna_distribution_cache` documents tagged with that category and `country: gb` have their `expiresAt` recomputed to no later than now plus 1 day
- **AND** documents for the same category tag under `country: us` are left unchanged.

#### Scenario: Retroactive update is batched

- **WHEN** more than 500 cached documents match an edited category and country
- **THEN** the system commits the `expiresAt` updates in batches of at most 500 documents per Firestore commit.
