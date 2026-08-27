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
