## Why

The per-category cache-duration override exposed at `/admin/adzuna` has no effect, for two compounding reasons confirmed against production Firestore: (1) the admin UI reads/writes collection `adzuna_categories` (plural, 60 live documents) while `jobs.ts`/`salary.ts` read the override from `adzuna_category` (singular, empty); and (2) even the collection name were correct, the admin UI's documents are keyed by a country-prefixed doc ID (e.g. `uk-accounting-finance-jobs`), while the lookup code queries by the bare category tag (e.g. `accounting-finance-jobs`) with no country prefix, so the doc ID would still never match. Every category lookup misses on both counts, so `cacheDays` silently falls back to the hardcoded 30-day default regardless of what an admin sets. This blocks the immediate operational need: Reed (UK primary provider) now has a 1000 requests/day quota, and cache duration needs to drop to 1 day for the relevant categories to avoid burning quota on stale-but-still-cached data, via the existing admin control rather than a code redeploy.

## What Changes

- Fix the collection-name mismatch: both reader call sites in `jobs.ts` (lines ~182, 257, 315) and `salary.ts` (lines ~226, 287, 370), plus their `.spec.ts` mocks, switch from `adzuna_category` to `adzuna_categories` — the collection the admin UI actually writes and that already holds live category data. No data migration needed; the singular collection is empty.
- Fix the doc-ID mismatch: construct the lookup doc ID as `${countryLabel}-${categoryTag}` (lowercased), matching exactly how `/admin/adzuna` writes it (`` `${targetCountry}-${cat.tag}`.toLowerCase() ``, `app/pages/admin/adzuna.vue:163`), using the same inline `countryCode === 'us' ? 'USA' : 'UK'`-style mapping already used elsewhere in this codebase (e.g. `server/api/market-data/update-match.post.ts:14-15`) rather than introducing a new shared utility, since no canonical gb/us↔UK/USA mapper currently exists in the codebase (confirmed by repo-wide search — every call site does this inline).
- When an admin saves an updated `cache` value for a category via `/admin/adzuna`'s "Save List" action, retroactively re-expire already-cached documents matching that category (and the category's country, so a UK/Reed category edit never touches USA/Adzuna-cached docs for a same-named tag) in `adzuna_jobs_cache` and `adzuna_distribution_cache` — recomputing `expiresAt` from the new `cacheDays` value, batched at ≤500 writes per Firestore commit (matching the existing convention in `server/utils/cachePurge.ts`). Without this, previously-cached documents keep their original (up to 30-day) `expiresAt` until naturally overwritten, defeating the purpose of lowering the setting.
- No change to the hardcoded defaults (30-day primary, 24-hour fallback) or to the cron purge job — both already function correctly today.

## Capabilities

### Modified Capabilities

- `market-data-caching`: the per-category `cacheDays` override now reads from (and is reliably sourced by) the single canonical `adzuna_categories` collection instead of a dead, empty `adzuna_category` collection; saving a category's cache duration via the admin UI now retroactively re-expires already-cached documents for that category/country instead of only affecting future cache writes.

## Impact

- `server/api/market-data/jobs.ts`, `server/api/market-data/salary.ts` — collection name fix in the `cacheDays` override lookup (primary-provider path and legacy pre-`expiresAt` fallback path).
- `server/api/market-data/tests/jobs.spec.ts`, `server/api/market-data/tests/salary.spec.ts` (or equivalent existing spec files) — mocks updated to the corrected collection name; new coverage for the retroactive re-expiry behavior.
- `app/pages/admin/adzuna.vue` — `saveStoredCategories` (or a new server endpoint it calls) triggers the retroactive `expiresAt` batch update after writing the category doc.
- Possible new `server/api/admin/**` endpoint (or server utility) to perform the batched retroactive update using `firebase-admin`, since client-side Firestore writes from the admin page are not well-suited to a >500-document batched update across two collections.
- No i18n strings needed — `/admin/adzuna` is under `~/pages/admin/`, exempt per `CODE_STANDARDS.md` §6.
