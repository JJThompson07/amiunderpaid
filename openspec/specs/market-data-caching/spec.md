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
