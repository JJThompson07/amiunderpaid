## Context

See proposal.md - Why/What Changes for the motivation and the high-level fix. This document covers the specific mechanics inside `server/utils/industryTrendsSync.ts`.

Today, `runIndustryTrendsSync` builds its category/country pair list via two independent code paths that happen to run side by side:

1. `extractActiveCategoryCountryPairs(cacheDocs)` reads `adzuna_jobs_cache` and derives the pairs actually synced.
2. `fetchCategoryLabels(country, appId, appKey)` calls Adzuna's `/jobs/{country}/categories` once per country **in the same run**, but only keeps it as a `Map<tag, label>` used for display labels on whatever pairs path (1) already decided to sync.

Path (2) already has exactly the data path (1) should have been using — the full, authoritative set of category tags Adzuna tracks for that country. No second Adzuna call is needed to fix this; it's a matter of using the Map (2) already builds as the pair source instead of discarding its keys.

## Goals / Non-Goals

**Goals:**
- Every category Adzuna returns from `/categories` for a tracked country gets a `/history` call every sync run, with no dependency on `adzuna_jobs_cache`.
- No new Adzuna endpoint or call is introduced — reuse the existing `fetchCategoryLabels` call.
- A failure to fetch a country's category list is surfaced as a visible sync failure, not silently treated as "zero categories to sync, nothing failed" — this reuses the exact kind of silent-failure path the proposal is fixing, so it must not be reintroduced one level up.

**Non-Goals:**
- Changing `lookupCount`/`countCategoryLookups` or the frontend's default-selected-industries behavior — out of scope, that feature continues reading `adzuna_jobs_cache` exactly as today.
- Changing the retry/backoff or batch-pacing logic (`fetchWithRetry`, `chunkForRateLimit`) — unaffected by where the pair list comes from.
- Changing the admin/cron trigger endpoints' request/response shape.
- Reducing Adzuna call volume further (e.g. skip-already-fresh logic) — that's the separate, already-in-flight `skip-adzuna-call-when-already-fresh` change; this proposal's pair-source fix is orthogonal to it and should compose cleanly (the skip-check operates per-pair regardless of how the pair list was derived).

## Decisions

**Use `fetchCategoryLabels`'s returned `Map<tag, label>` keys as the pair source, per country.**
Alternative considered: introduce a second, dedicated "list categories" call separate from label-fetching. Rejected — it would double Adzuna calls for no benefit; the existing call already returns everything needed.
Alternative considered: hardcode a static list of category tags in the repo (e.g. a `shared/constants` file), refreshed manually when Adzuna adds/removes categories. Rejected — Adzuna's taxonomy is already fetched live every run at near-zero cost (2 calls/month total), so a static list would just be a second source of truth that can silently drift from reality, reintroducing a milder version of the same staleness problem this change fixes.

**Sync a fixed `['gb', 'us'] as const` country list instead of deriving `countriesInUse` from pairs.**
This app is strictly dual-tenant (AmIUnderpaid/UK, BenchmarkMyRole/US) per `AGENTS.md` §7 — there is no scenario today where the sync should cover a country outside this pair, and the fixed list removes the sync's last remaining dependency on `adzuna_jobs_cache` for scope decisions.

**Treat a failed categories fetch as a sync failure for that country, not a silent empty result.**
Today, `fetchCategoryLabels` swallows any error from the `/categories` call and returns an empty `Map` (acceptable when the Map only fed display labels — the sync still ran against the cache-derived pairs either way). Once the Map's keys *are* the pair list, swallowing a categories-fetch failure would mean "every category for that country silently gets zero Adzuna calls this month" — the exact silent-staleness failure mode this proposal exists to remove, just moved up one level. `runIndustryTrendsSync` must instead detect a categories-fetch failure per country and record it as an explicit failure in `SyncSummary` (e.g. a synthetic `SyncOutcome` entry, or a dedicated field) rather than treating "0 pairs for this country" as a quiet no-op success.
Alternative considered: let `fetchCategoryLabels` throw and let the whole sync run fail. Rejected — the existing per-pair failure isolation (one category's Adzuna error doesn't abort the batch) is a deliberate existing property (`industry-trends` spec's "Rate-Limit-Safe Sync" requirement); a categories-fetch failure for one country (e.g. `us`) should not prevent the other country (`gb`) from syncing successfully in the same run.

## Risks / Trade-offs

- **[Risk]** Adzuna call volume per run rises from "however many categories had recent search traffic" (recently as low as 21 combined) to the full tracked set per country unconditionally (~50/month combined, per the proposal's estimate) → **Mitigation**: still trivial against the account's 2,500/month cap; no mitigation needed beyond the existing per-minute batch pacing, which already handles this.
- **[Risk]** A transient Adzuna outage on the `/categories` endpoint for one country (after `fetchWithRetry`'s existing 429/503 retries are exhausted) now blocks that entire country's sync for the run, whereas previously it only degraded display labels → **Mitigation**: this is the explicit, visible failure mode chosen above over the alternative (silent skip); the next scheduled sync run naturally retries the whole country.
- **[Risk]** Local development cannot currently exercise live Adzuna calls — the `.env` file's `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` returned `401 AUTH_FAIL` directly against Adzuna during this investigation, separate from and not blocking this change (production's real runtime credentials are confirmed working — the admin-triggered sync succeeded live during this same investigation) → **Mitigation**: unit tests mock `$fetch` entirely, matching the existing test pattern, so this doesn't block implementation or verification; worth a separate look at the local `.env` value, outside this change's scope.

## Migration Plan

No data migration. `adzuna_industry_trends` documents already use `{country}_{categoryTag}` doc IDs; previously-skipped categories simply start receiving writes again on the next sync run (manual admin trigger or the next scheduled monthly cron). No deploy-order dependency on the separate `skip-adzuna-call-when-already-fresh` change — either can land first.
