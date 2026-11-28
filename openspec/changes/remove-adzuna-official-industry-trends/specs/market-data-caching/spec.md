## MODIFIED Requirements

### Requirement: Fallback-provider results expire independently of the primary provider

The market-data endpoints (`server/api/market-data/jobs.ts`, `server/api/market-data/salary.ts`) SHALL cache responses with listings from the regional primary provider (Reed for UK, Careerjet for USA) for `config.liveCachePrimaryTtlDays` days (default 7). Responses from the fallback provider (Jooble for USA) and zero-listing responses SHALL be cached for `config.liveCacheFallbackTtlHours` hours (default 24). Both values are server `runtimeConfig`; no per-category TTL is read from Firestore.

#### Scenario: Adzuna serves the request

- **WHEN** a market-data request would previously have been served by Adzuna
- **THEN** no Adzuna call is made; the request is served by the regional primary provider, and a document with listings from that provider gets `expiresAt` = now + `config.liveCachePrimaryTtlDays` days (default 7).

#### Scenario: A fallback provider serves the request

- **WHEN** a USA market-data request falls back to Jooble, or a primary provider returns zero listings
- **THEN** the cached document's `expiresAt` is set to now plus `config.liveCacheFallbackTtlHours` hours (default 24).

#### Scenario: salary.ts does not inherit a long cache window from the jobs cache on a fallback response

- **WHEN** `salary.ts` reuses or writes a fallback-provider or zero-listing response
- **THEN** its `expiresAt` is now plus `config.liveCacheFallbackTtlHours` hours, never the primary TTL.

### Requirement: Cache Key Versioning & Stale Provider Invalidation

The market-data cache layer SHALL prefix cache keys with `v2-`, use one key format across `/api/market-data/jobs` and `/api/market-data/salary`, and store full dual-tier results (up to 100 listings) in `market_jobs_cache` and salary distributions (`histogram`, `mean`, `count`) in `market_distribution_cache`, so `/jobs/...` and `/salary/...` searches warm and reuse the same document. A cached document with `provider === 'adzuna'`, or a UK document with `provider !== 'reed'`, SHALL be treated as a cache miss.

#### Scenario: Versioned cache key generation

- **WHEN** `generateCacheKey` is invoked for a search query
- **THEN** it SHALL prefix the resulting key with `v2-`, isolating fresh search results from legacy unversioned cache entries.

#### Scenario: Harmonized cache key lookup across endpoints

- **WHEN** a job search request is executed on `/api/market-data/jobs` for a given title, location, country, jobType, contractType, and category
- **THEN** it SHALL write the result to `market_jobs_cache` with key `${generateCacheKey(title, location, country, category)}-${jobType}-${contractType}`
- **AND** a subsequent `/api/market-data/salary` request for the same parameters SHALL reuse `{ histogram, mean, count, provider }` from that document for any active provider (`reed`, `careerjet`, or `jooble`) without an upstream request.

#### Scenario: Full result retention in jobs cache

- **WHEN** provider data with up to 100 listings across Tier 1 and Tier 2 is retrieved
- **THEN** `market_jobs_cache` SHALL persist all retrieved results (both `results` and `similarResults`) rather than slicing to 10 before persistence.

#### Scenario: Invalidation of stale UK provider entries

- **WHEN** a market-data request reads a cached document where `provider === 'adzuna'`, or a UK request reads a document where `provider !== 'reed'`
- **THEN** the system SHALL treat the entry as a cache miss, fetch fresh data from the current regional provider, and overwrite the cached document.

### Requirement: Automated Background Cache Purging

The system SHALL provide a background cron endpoint (`GET /api/cron/clean-cache`) that purges expired documents from `market_jobs_cache` and `market_distribution_cache`. It MUST authenticate with `verifyCronSecret(event)` (timing-safe comparison against the private `CRON_SECRET`), and MUST fail closed with 500 when `CRON_SECRET` is not configured. Batch deletions MUST commit at most 500 documents at a time. When `RESEND_API_KEY` is configured, the endpoint SHALL email summary reports and crash alerts.

#### Scenario: Scheduled background cron executes cache purge with valid credentials

- **WHEN** a scheduled cron job sends a GET request to `/api/cron/clean-cache` with a valid `CRON_SECRET` Bearer token
- **THEN** the system deletes all expired entries from `market_jobs_cache` and `market_distribution_cache` where `expiresAt < now` (and legacy entries where `timestamp < (now - 120 days)`)
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

## REMOVED Requirements

### Requirement: Per-category cache duration is sourced from a single canonical collection and document ID

**Reason:** `adzuna_categories` and `/admin/adzuna` are retired in favour of the code-owned `shared/utils/industries.ts` taxonomy and server `runtimeConfig` cache TTLs (`liveCachePrimaryTtlDays` default 7 days, `liveCacheFallbackTtlHours` default 24 hours).

**Migration:** Primary-provider responses use `config.liveCachePrimaryTtlDays` days and fallback responses use `config.liveCacheFallbackTtlHours` hours without querying a Firestore categories collection.

### Requirement: Saving a category's cache duration retroactively re-expires already-cached documents

**Reason:** The `/admin/adzuna` per-category TTL editor and `/api/admin/re-expire-category-cache` endpoint are removed along with `adzuna_categories`.

**Migration:** None required; cache entries expire under the configured `liveCachePrimaryTtlDays` / `liveCacheFallbackTtlHours` TTLs and can be purged via `/admin/admin-actions`.
