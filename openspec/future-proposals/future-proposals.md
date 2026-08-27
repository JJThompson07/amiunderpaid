# Future Proposals

Ideas that are worth doing but deliberately deferred — not yet scaffolded as an
active `openspec/changes/<name>/` proposal. Move an entry here into
`openspec/changes/` when it's picked up, and delete it from this file at that
point.

## algolia-cache-method

**What:** Cache the Algolia salary-benchmark queries in `useMacroData.ts` and
`useMicroData.ts` (called from `useLocationEngine.ts`) server-side, the same
way `server/api/market-data/jobs.ts` already caches Adzuna calls via
`defineCachedFunction`. Every SSR page render on `/salary/[title]/[country]/[[location]]`
and `/benchmark/[title]/[country]/[[location]]` currently fires live Algolia
queries for national + regional salary baselines, even though that underlying
data only changes when the `sync-algolia` admin action is run.

**Why deferred:** Wanted the zero-downside redundant-call reduction (tracked
separately, see `openspec/changes/` once scaffolded) landed and verified
first. Caching is a bigger lever for repeat-search volume but introduces a
staleness tradeoff that needs its own design pass.

**Tradeoff to design around:** A cache TTL means visitors could see stale
salary data for up to the TTL window after an admin re-syncs Algolia data.
Needs either a moderate TTL (hours, not the 1hr used for Adzuna) or an
explicit cache-bust hook wired into `server/api/admin/sync-algolia.post.ts`
when that endpoint completes a sync.

**Where to start:** `server/api/market-data/jobs.ts` (reference pattern for
`defineCachedFunction`), `app/composables/useMacroData.ts`,
`app/composables/useMicroData.ts`.

## job-dictionary-firestore-first-audit

**What:** `useJobDictionary.ts` (called from `BaseSearchForm.vue:382` on every
search-form submission, before navigation) resolves a job's government ID by
checking Firestore first (`/api/engine/match-title`) and only falls back to a
live Algolia query (`uk_job_groups` / `usa_job_groups` indices — distinct from
the `job_titles` / `salary_benchmarks` indices `useMarketData.ts` queries) when
Firestore has no match. Whatever ID it resolves gets attached to the
result-page URL as `gov_id`, which means `useMarketData.ts`'s own identity
resolution (the dictionary/benchmark lookup `reduce-algolia-benchmark-calls`
optimized) takes the "exact ID bypass" branch on effectively every search made
through the actual search form, and never calls Algolia at all.

Confirmed live during manual verification of `reduce-algolia-benchmark-calls`
(2026-08-27): several different job titles were searched through the real
search form and none of them caused `useMarketData` to fire a single Algolia
call — `gov_id` was always already present from the form's own resolution.

**Why worth a look:** Two things worth auditing separately from the change
that surfaced this:

1. Whether `useJobDictionary.ts`'s own Algolia fallback (`uk_job_groups` /
   `usa_job_groups`) has room for the same kind of redundant-call reduction
   `reduce-algolia-benchmark-calls` applied to `useMarketData.ts` /
   `useMicroData.ts` / `useMacroData.ts` — it wasn't in scope for that change
   since it's a distinct code path (form submission, not the result-page data
   orchestrator).
2. Whether `useMarketData.ts`'s dictionary/benchmark lookup is worth keeping
   as complex as it is, given the search-form path already resolves the ID
   via Firestore/Algolia beforehand in the common case — it currently only
   earns its keep for traffic that skips the form entirely (direct/deep links
   to a `/salary/...` or `/benchmark/...` URL with no `gov_id` query param, or
   when `useJobDictionary.ts` itself returns `ambiguous`/`unmapped`).

**Where to start:** `app/components/BaseSearchForm.vue` (the `gov_id:
finalGovId` query param assignment), `app/composables/useJobDictionary.ts`,
`server/api/engine/match-title.get.ts`.
