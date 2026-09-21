## Context

See `proposal.md` for background and motivation.

The application caches market-data query results in two Firestore collections:

1. `adzuna_jobs_cache`: Stores job listing responses keyed by normalized parameters. Modern records store an `expiresAt` timestamp (24 hours for fallback providers, 30+ days for primary providers) alongside `timestamp`.
2. `adzuna_distribution_cache`: Stores salary distribution histograms with `expiresAt` and `timestamp`.

Currently, `server/api/admin/clean-cache.post.ts` provides an admin-only endpoint to delete expired entries in `adzuna_jobs_cache` and `adzuna_distribution_cache`, invoked solely via the UI at `app/pages/admin/admin-actions.vue`. No automated background cron exists for cache purging.

`search_history` (user search query logs) is explicitly out of scope for this change — those records are retained indefinitely; see Non-Goals.

## Goals / Non-Goals

**Goals:**

- Provide automated daily execution of market-data cache purging via Vercel Cron (`GET /api/cron/clean-cache`).
- Encapsulate all purge and batch deletion logic into a reusable, unit-tested server utility (`server/utils/cachePurge.ts`).
- Ensure all batch deletions respect Firestore's 500-write batch limit and execute without memory bloat.
- Protect the cron endpoint using constant-time `CRON_SECRET` validation (`timingSafeEqual`), and provide unattended alerting and crash notifications via Resend, matching `server/api/cron/sync-trends.get.ts`.
- Maintain the repository's required **80% minimum per-file test coverage** across all new and modified server utilities and endpoints (per `CODE_STANDARDS.md` §8 and `vitest.config.ts`).

**Non-Goals:**

- Not purging, retaining, or otherwise modifying `search_history` in any way — those records remain untouched indefinitely. This was explicitly descoped after implementation review; see `proposal.md` for the decision.
- Not modifying how live searches write to `adzuna_jobs_cache` during normal user search flows.
- Not purging user accounts, recruiter leads (`recruiter_leads`), territory subscriptions, or transactions.

## Decisions

### Decision 1: Shared Core Utility `server/utils/cachePurge.ts`

- **Choice**: Implement `purgeExpiredCache(db?: Firestore, options?: PurgeOptions): Promise<PurgeSummary>` in `server/utils/cachePurge.ts`.
- **Rationale**: Decouples the business logic of database queries, chunked batch deletions, and metrics accumulation from HTTP request handling. Allows direct unit testing with Vitest without mocking H3 event contexts.
- **Alternatives Considered**: Keeping inline deletion logic in `clean-cache.post.ts` and duplicating it in `clean-cache.get.ts` (rejected: duplicates code, increases risk of divergence, harder to test).

### Decision 2: Market-Data Cache Purge Strategy (Modern and Legacy Entries)

- **Choice**:
  - Modern cache documents (`adzuna_jobs_cache` and `adzuna_distribution_cache`): Query `.where('expiresAt', '<', now).limit(500)` in a batch-delete loop.
  - Legacy cache documents: Query `.where('timestamp', '<', oneHundredTwentyDaysAgo).limit(500)` in a batch-delete loop.
- **Rationale**: Modern entries have an explicit `expiresAt` date that enables instant single-field querying. Legacy entries that predate `expiresAt` had a maximum TTL of 120 days; querying `timestamp < (now - 120 days)` safely captures and purges all expired legacy records without needing complex multi-field checks.

### Decision 3: Cron Endpoint Security, Alerting, and Schedule

- **Choice**:
  - **Endpoint**: `GET /api/cron/clean-cache` in `server/api/cron/clean-cache.get.ts`.
  - **Authentication**: Read `config.cronSecret` from private `runtimeConfig`. Verify the `Authorization: Bearer <secret>` header using constant-time comparison (`crypto.timingSafeEqual`). Fail closed with 500 if `cronSecret` is unconfigured, and 401 if unauthorized.
  - **Alerting & Email**: Match the unattended cron pattern in `server/api/cron/sync-trends.get.ts`. When `config.resendApiKey` is configured, send a completion summary email and send a crash email if an unhandled error occurs.
  - **Schedule**: Add `"schedule": "0 4 * * *"` (daily at 04:00 UTC) to `vercel.json`.
- **Rationale**: Conforms to the repository's established cron conventions. Constant-time comparison prevents timing attacks on `CRON_SECRET`. Running at 04:00 UTC executes during low global traffic hours.

### Decision 4: Firestore Chunked Batch Deletion

- **Choice**: Query in slices of 500 documents (`.limit(500)`), iterate over the snapshot to queue batch deletes on `db.batch()`, commit the batch, and loop until `.empty`.
- **Rationale**: Firestore strictly caps batch writes at 500 operations. Looping in 500-item slices ensures maximum throughput while staying strictly within Firestore limits and bounding memory usage.

## Risks / Trade-offs

- **[Risk] High volume of documents on initial run causing function timeout**
  → _Mitigation_: Incremental batch commits (`.limit(500)`) delete documents in chunks. If the Vercel function approaches its execution limit, committed batches remain permanently deleted, and the next daily run will resume cleaning the remaining documents.
- **[Risk] Unintended deletion of active cache**
  → _Mitigation_: Bounded expiration filters (`expiresAt < now`, legacy `timestamp < 120_DAYS_AGO`). Unit tests explicitly verify query filters and boundary conditions.
- **[Risk] CRON_SECRET misconfiguration**
  → _Mitigation_: Endpoint fails closed with status 500 if `config.cronSecret` is missing, preventing unintended open execution.
