## Context

Two independent, compounding bugs make the per-category cache-duration override at `/admin/adzuna` a dead control today (see proposal.md - Why, verified against live production Firestore):

1. **Collection name**: `jobs.ts`/`salary.ts` read `adzuna_category` (singular, empty); the admin UI and everything else reads/writes `adzuna_categories` (plural, 60 live docs).
2. **Document ID shape**: the admin UI keys category docs as `` `${targetCountry}-${cat.tag}`.toLowerCase() `` (`app/pages/admin/adzuna.vue:163`, e.g. `uk-accounting-finance-jobs`), but `jobs.ts`/`salary.ts` look the override up by the bare `categoryTag` (e.g. `accounting-finance-jobs`), with no country prefix.

Both lookups occur at 4 call sites total: `jobs.ts` legacy-fallback path (~line 257) and primary-provider `expiresAt` calculation (~line 315); `salary.ts` legacy-fallback path (~line 287) and primary-provider `expiresAt` calculation (~line 370).

Additionally, per proposal.md, an admin lowering a category's `cache` value needs already-cached documents in `adzuna_jobs_cache`/`adzuna_distribution_cache` retroactively re-expired, not just future writes affected.

## Goals / Non-Goals

**Goals:**

- Make the existing admin per-category `cache` field the single source of truth it was always intended to be, with zero change to the admin UI's own data model (collection name, doc ID shape, `cache` field) — the server code conforms to what the UI already writes, not the other way around, since the UI's format is what's live in production.
- Ensure a saved cache-duration change is reflected immediately in already-cached documents for that category/country, not just future cache writes.
- Keep the fix mechanically identical across `jobs.ts` and `salary.ts`'s four call sites — same collection, same doc ID formula, same country-label mapping.

**Non-Goals:**

- Not introducing a new shared `gb`/`us` ↔ `UK`/`USA` mapping utility. No canonical one exists in this codebase (confirmed by repo-wide search); the dominant existing convention is an inline ternary at each call site (e.g. `server/api/market-data/update-match.post.ts:14-15`). Introducing an abstraction for 4 call sites inside 2 already-related files is over-engineering relative to matching existing repo convention.
- Not changing the hardcoded defaults (30-day primary, 24-hour fallback) or the `adzuna_category`/`adzuna_categories` naming anywhere else in the codebase (e.g. not touching the cron purge job, which already operates correctly against `adzuna_jobs_cache`/`adzuna_distribution_cache`, not the category collection).
- Not building a generic "admin-triggered bulk Firestore update" framework — this is a narrowly scoped retroactive re-expiry for one save action.
- Not migrating or backfilling any data — the singular `adzuna_category` collection is empty (verified live), so there is nothing to migrate.

## Decisions

**Decision 1 — Fix direction: conform code to the admin UI's existing live data, not vice versa.**
The plural collection (`adzuna_categories`) and its `${countryLabel}-${tag}` doc ID already hold 60 real, currently-synced category documents (`Sync Now` in `/admin/adzuna` is the only writer of this data anywhere in the codebase). Alternative considered: rename the admin UI's collection/doc-ID scheme to match the code's current (broken) singular/unprefixed assumption — rejected, since it would require a live data migration of the only real category dataset in the system for no benefit, and the UI's scheme is also used correctly elsewhere (`app/composables/useCategories.ts`, `app/pages/recruiter/territories/index.vue`, `firestore.rules:60`, `server/api/admin/seed.post.ts`).

**Decision 2 — Country-label mapping: inline ternary matching `update-match.post.ts`, not a new shared util.**
Use `countryCode === 'us' ? 'USA' : 'UK'` inline in the four `jobs.ts`/`salary.ts` call sites (both files already compute `countryCode` as `'gb'`/`'us'` upstream). This exactly matches the string values (`'UK'`/`'USA'`) the admin UI's `targetCountry` ref uses when building doc IDs. Alternative considered: extract a shared `getCategoryDocId(countryCode, tag)` helper in `server/utils/` — reasonable, but four call sites across two files that are already tightly coupled (salary.ts explicitly mirrors jobs.ts's cache-key logic) don't yet justify a new shared utility; each `expiresAt`-calculation block already has near-identical category-lookup code inline, so a one-line ternary keeps the diff minimal and matches the file's existing self-contained style. Revisit if a third call site appears.

**Decision 3 — Retroactive re-expiry runs server-side via a new admin endpoint, not client-side Firestore batch writes.**
`saveStoredCategories` in `adzuna.vue` currently does a client-side `writeBatch` limited to updating the category docs themselves (≤ a few dozen documents, one batch). Re-expiring matching `adzuna_jobs_cache`/`adzuna_distribution_cache` documents requires querying by `categoryTag` + `country` across two collections that could hold many more documents than one 500-doc Firestore batch allows, and Firestore security rules should not need to grant the admin client broad write access to the cache collections for this one operation. Instead, `saveStoredCategories` calls a new authenticated `POST /server/api/admin/re-expire-category-cache` endpoint (Bearer-token-verified per `CODE_STANDARDS.md` §7) that uses `firebase-admin` to query and batch-update (≤500 per commit, per `cachePurge.ts`'s existing convention) both cache collections for the edited categories. Alternative considered: keep it client-side with `vuefire`'s `useCollection` + `writeBatch`, chunked at 500 — rejected because it requires the admin client to have write access to `adzuna_jobs_cache`/`adzuna_distribution_cache` in `firestore.rules`, widening the admin's effective write surface for no reason when a server endpoint (already the pattern for `/api/admin/clean-cache`) can do it with the existing `firebase-admin` (unrestricted by rules) connection.

**Decision 4 — Matching by `categoryTag` + `country` field, not by re-deriving `expiresAt` from `timestamp`.**
Cached documents store `categoryTag` (top-level) and `searchParams.country` (`'gb'`/`'us'`) already (see `jobs.ts:331,338`, `salary.ts:385,392`). The re-expiry query filters `where('categoryTag', '==', tag).where('searchParams.country', '==', countryCode)` and sets `expiresAt` to `now + cacheDays` (recomputed from the just-saved value), rather than trying to preserve the original cache-write time — simplest correct behavior, and matches the proposal's intent ("reflect the new duration ... without waiting for a natural cache miss").

## Risks / Trade-offs

- **[Risk] A category tag collides across countries only by coincidence of naming, not a real shared taxonomy** → Mitigated by Decision 4's explicit `country` filter; verified scenario in specs/market-data-caching covers this directly.
- **[Risk] New admin endpoint becomes another place secrets/tokens must be verified correctly** → Mitigated by following the exact existing Bearer-token-verification pattern already used by every other `server/api/admin/**` route (`CODE_STANDARDS.md` §7), not inventing new auth logic.
- **[Trade-off] Retroactive re-expiry adds a Firestore query+batch-write on every category save, not just a cheap doc update** → Acceptable: saves are infrequent, manual admin actions (not on any hot path), and the category list is capped at ~60 documents/sync, so the number of categories touched per save is small even though the number of cached documents per category could be larger.

## Migration Plan

No data migration required (Decision 1). Rollout is a standard code deploy:

1. Merge the `jobs.ts`/`salary.ts` collection-name + doc-ID fix and the new re-expiry endpoint together (they're both needed for the admin control to have any real effect — shipping one without the other leaves the feature still broken).
2. No feature flag needed — this restores previously-intended, already-shipped-looking behavior (the admin UI has looked functional for a while) rather than introducing new user-facing surface area.
3. Rollback: revert the commit. The singular `adzuna_category` collection remains untouched and empty either way, so rollback is a pure code revert with no data cleanup.
4. Post-deploy verification (see tasks.md): use `/admin/adzuna` to set a UK category's `cache` to 1 and confirm (a) the next Reed-served search for that category writes `expiresAt` ~1 day out, and (b) any pre-existing cached doc for that category/UK is immediately re-expired to ~1 day out after save, per CODE_STANDARDS.md §10's require-verification-before-irreversible/environment-dependent-change rule — this is the direct, real-environment check for the whole point of the change.
