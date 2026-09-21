## Why

Over time, Firestore accumulates thousands of expired market-data cache entries (`adzuna_jobs_cache` and `adzuna_distribution_cache`). Currently, cache cleanup is only executed manually when an administrator visits `/admin/admin-actions` and clicks "Run Cache Cleanup". There is no automated schedule to purge expired records in the background.

Automating periodic purging via a scheduled cron task ensures Firestore stays within storage limits and reduces database costs, without touching any other collection.

**Scope note**: an earlier draft of this change also purged `search_history` on a retention policy (180-day cap, 30-day abandoned-search purge). That was implemented, verified working (tests + `pnpm test:verify` passing), and then explicitly descoped by the requester after implementation — `search_history` is retained indefinitely and this change only ever touches `adzuna_jobs_cache` / `adzuna_distribution_cache`.

## What Changes

- **Shared Cache Purge Utility**: Extract cache cleaning logic into a dedicated server utility (`server/utils/cachePurge.ts`) that handles batch deletions (in chunks of up to 500) across `adzuna_jobs_cache` and `adzuna_distribution_cache`:
  - Deletes expired job listings and salary distribution histograms using single-field inequality queries (`expiresAt < now` for modern entries, and `timestamp < (now - 120 days)` for legacy entries).
- **Automated Vercel Cron Endpoint**: Create `GET /api/cron/clean-cache` (`server/api/cron/clean-cache.get.ts`) protected by `CRON_SECRET` using timing-safe comparison (`timingSafeEqual`), matching the unattended execution, alerting, and crash email pattern established in `server/api/cron/sync-trends.get.ts`.
- **Scheduled Cron Job Configuration**: Add the `/api/cron/clean-cache` cron trigger to `vercel.json` running daily at 04:00 UTC (`0 4 * * *`).
- **Updated Admin Endpoint**: Refactor `POST /api/admin/clean-cache` (`server/api/admin/clean-cache.post.ts`) to delegate to `server/utils/cachePurge.ts`.
- **Unit Test Coverage**: Add comprehensive unit tests in `server/utils/tests/cachePurge.spec.ts` and `server/api/cron/tests/clean-cache.spec.ts`, and update `server/api/admin/tests/clean-cache.spec.ts` adhering to the repository's 80% minimum per-file coverage standard.

## Capabilities

### New Capabilities

<!-- None: Behavior extends the existing market-data-caching and admin-actions-page capabilities -->

### Modified Capabilities

- `market-data-caching`: Add requirement for automated, periodic background purging of expired `adzuna_jobs_cache` and `adzuna_distribution_cache` documents via scheduled cron with Resend alerting.

`admin-actions-page` is unaffected: the manual Cache Cleanup action's response shape and behavior are unchanged from before this change (only its internal implementation now delegates to the shared `cachePurge.ts` utility), so there is no requirement delta to record for it.

## Impact

- **Database / Firestore**: Regularly cleans expired documents in `adzuna_jobs_cache` and `adzuna_distribution_cache` only. `search_history` is untouched.
- **Server API**: Introduces `GET /api/cron/clean-cache` and updates `POST /api/admin/clean-cache`.
- **Configuration**: Updates `vercel.json` with a daily cron trigger for `/api/cron/clean-cache`.
- **Dependencies**: No new npm dependencies required (`node:crypto`, `firebase-admin/firestore`, `resend`, and `h3` are already present).
- **Admin UI**: No behavior change to `app/pages/admin/admin-actions.vue` beyond an updated Cache Cleanup card description.
