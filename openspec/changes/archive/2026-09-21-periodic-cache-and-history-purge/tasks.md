## 1. Pre-flight & Schema Verification

- [x] 1.1 Perform pre-flight verification confirming real Firestore document shapes across `adzuna_jobs_cache` and `adzuna_distribution_cache` (confirming `expiresAt` vs `timestamp` usage and that legacy pre-`expiresAt` documents exist in practice).
  - Verified: `server/api/market-data/jobs.ts` and `salary.ts` write `adzuna_jobs_cache`/`adzuna_distribution_cache` docs with `timestamp` (serverTimestamp) + `expiresAt` (Date); both files' read paths explicitly fall back to `timestamp` when `expiresAt` is absent, confirming legacy (pre-`expiresAt`) documents exist in practice.

## 2. Core Server Utility

- [x] 2.1 Implement `server/utils/cachePurge.ts` exporting `purgeExpiredCache(db?: Firestore, options?: PurgeOptions): Promise<PurgeSummary>`, executing batch deletions in chunks of at most 500 documents per batch for:
  - `adzuna_jobs_cache` entries where `expiresAt < now` and legacy entries where `timestamp < (now - 120 days)`.
  - `adzuna_distribution_cache` entries where `expiresAt < now` and legacy entries where `timestamp < (now - 120 days)`.
  - `search_history` is explicitly untouched (see `design.md` Non-Goals) — no query against that collection.
- [x] 2.2 Create `server/utils/tests/cachePurge.spec.ts` with unit tests covering all query filters, multi-batch chunking (>500 documents), empty collections, and error propagation, achieving >=80% branch, statement, function, and line coverage.
  - 8/8 tests passing.

## 3. Scheduled Background Cron Endpoint & Configuration

- [x] 3.1 Implement `server/api/cron/clean-cache.get.ts` secured with `CRON_SECRET` from private `runtimeConfig`, utilizing `timingSafeEqual` for constant-time authorization comparison, failing closed with 500 if unconfigured and 401 if unauthorized, sending summary/crash alert emails via Resend when `resendApiKey` is configured (mirroring `server/api/cron/sync-trends.get.ts`), and delegating execution to `purgeExpiredCache`.
- [x] 3.2 Create `server/api/cron/tests/clean-cache.spec.ts` covering missing secret (500), missing auth header (401), invalid bearer token (401), timing-safe comparison, Resend summary/crash email dispatch, and successful cron invocation (200), achieving >=80% coverage.
  - 8/8 tests passing.
- [x] 3.3 Update `vercel.json` to register the cron route `"/api/cron/clean-cache"` on a daily schedule (`"0 4 * * *"`).

## 4. Admin Endpoint Integration

- [x] 4.1 Update `server/api/admin/clean-cache.post.ts` to delegate to `purgeExpiredCache` (response shape unchanged: `deletedJobs`, `deletedDistributions`).
- [x] 4.2 Update `server/api/admin/tests/clean-cache.spec.ts` to verify the refactored admin endpoint behavior, admin authorization verification, and response format.
  - 4/4 tests passing.
- [x] 4.3 Update `app/pages/admin/admin-actions.vue` Cache Cleanup card description to reflect the two-collection purge it actually performs (no UI/response-shape change, since `search_history` purging was descoped — see `proposal.md` scope note).

## 5. Verification Gate

- [x] 5.1 Run `pnpm test:verify` to execute all lint checks, typecheck, unit tests with the 80% per-file coverage threshold, Firestore security rules tests, and Playwright e2e tests, confirming zero regressions.
  - Passed clean: lint (spellcheck, typecheck, Prettier, structure-lint, check-standards, ESLint), unit tests with per-file coverage thresholds, Playwright e2e tests, Firestore rules tests.
