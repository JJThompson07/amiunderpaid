## ADDED Requirements

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
