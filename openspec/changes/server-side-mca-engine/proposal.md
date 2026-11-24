## Why

The MCA score is assembled inside one page composable. `app/composables/useLocationEngine.ts` orchestrates three more composables, `useMarketData` (role → SOC resolution), `useMacroData` (all-roles baselines) and `useMicroData` (per-occupation baselines). All three query Algolia through the public search client (`$algolia`), and the result goes into `calculateUKBenchmarkScore` / `calculateUSABenchmarkScore` in `shared/utils/`. The pipeline runs inside `useAsyncData`, so it is tied to a Vue page. A Nitro route can't call it, and the BenchmarkMyRole API (`api-keys-metering-billing`) needs the identical calculation server-side. Building a second pipeline for the API would give two engines that drift apart.

Moving the engine also fixes a confirmed production bug. Probed against live Algolia on 2026-11-11:

- **The UK regional modifier is always 1.0.** `useMacroData` looks up UK regional all-roles medians with `searchTitle:"all employees"`. The admin seeder writes UK regional records (ASHE Table 7.7a) with `title: 'All'`, so `searchTitle` is `"all"`. Every regional UK search returns 0 hits (`"all"` matches 782), and `calculateRegionalModifier` falls back to `1.0`. So no UK MCA score is adjusted for the user's region today. London's 2026 record (`E12000007`, median £53,132) and the national median (£40,911) are both in the index; the lookup just never matches.

The other confirmed UK bug, per-occupation regional data (`microRegionalData`) always being null, is a missing-data problem: UK regional records aren't keyed by SOC. The fix is ingesting ASHE Table 15 in `uk-geo-economics-ingestion`. This change makes the engine ready to use that data the moment it lands.

## What Changes

- **New server engine** in `server/utils/engine/`:
  - `resolveRole`: role resolution keyed by SOC. The cascade is SOC supplied → exact synonym in `uk_job_groups.titles` / `usa_job_groups.titles` → fuzzy search (ported from `useMarketData`) → generic fallback. It returns `{ soc, title, method, confidence, alternatives }`.
  - `getBaselines`: national and regional, all-roles and per-occupation baselines read from Firestore `salary_benchmarks` / `regional_salary_benchmarks`, pinned to one data year, behind a bounded in-memory TTL cache.
  - `computeBenchmark`: orchestrates resolution, baselines and the live histogram (through the existing `/api/market-data/salary` handler via Nitro's internal `$fetch`), then calls the existing `shared/utils` scorers.
- **New internal endpoint** `GET /api/engine/benchmark`: the engine for amiunderpaid pages. It returns raw scores, breakdown, baselines, resolution and the live histogram. UI formatting (`formatMcaScoreForUi`) stays on the client, because it needs `t()`.
- **Fix:** the UK regional all-roles baseline is read from the `title: 'All'` records keyed by location, so the regional modifier finally applies.
- **Modified:** `useLocationEngine` replaces its four-composable Algolia pipeline with one `useFetch` to `/api/engine/benchmark`. It fills the existing `useJobs` histogram state and the `useMarketData` identity state from the response, so components are unchanged.
- **Removed:** `app/composables/useMacroData.ts`, `app/composables/useMicroData.ts` and their tests; the resolver functions in `useMarketData.ts`. `useMarketData` keeps its shared state and the `SalaryBenchmark` type used by `useJobAutocomplete`, `UKComparison` and others.
- **Modified:** `job_suggestions` writes gain a `source` field (`'site' | 'user'` now; `'api'` is added by `api-keys-metering-billing`), shown in the admin suggestions list.

## Scope

- The engine utilities, their unit tests, and the internal endpoint.
- Switching `useLocationEngine` to the endpoint, with the existing results page UI unchanged.
- The UK regional all-roles baseline fix.
- A `source` field on suggestions.

## Non-goals

- The public `/v1` API, keys or billing: `api-keys-metering-billing`.
- New UK per-occupation regional data (ASHE Table 15): `uk-geo-economics-ingestion`. Until then UK `microRegional` stays null, exactly as today.
- Changing scoring maths or weights in `shared/utils/math.ts`, `uk.ts` or `usa.ts`.
- Reed percentiles or geo cascade for the live tier: `reed-percentiles-and-geo-cascade`.
- Algolia-backed UI search (autocomplete, `NoData`, `GovernmentUserSelection`), which keeps using the public search client.

## Capabilities

### New Capabilities

- `benchmark-engine`: server-side MCA computation (role resolution cascade, single-year baselines, regional modifier, live tier) exposed through `/api/engine/benchmark`.

### Modified Capabilities

- `regional-benchmark-data`: the "UK regional query returns all matching regions" requirement moves from `useMicroData`'s Algolia page size to the server engine's Firestore read.

## Impact

- **New:** `server/utils/engine/{resolveRole,baselines,computeBenchmark,types}.ts` (+ tests), `server/api/engine/benchmark.get.ts` (+ test).
- **Modified:** `app/composables/useLocationEngine.ts` (+ spec), `app/composables/useMarketData.ts` (+ spec), `server/api/engine/match-title.get.ts` (now delegates to the shared synonym lookup), `server/api/market-data/update-match.post.ts`, `server/api/user/suggestion/index.post.ts`, `app/pages/admin/user-suggestions.vue`, `nuxt.config.ts` (private `algoliaSearchApiKey`).
- **Deleted:** `app/composables/useMacroData.ts`, `app/composables/useMicroData.ts` and their specs.
- **Behaviour:** UK MCA scores change wherever the user gave a location whose all-roles regional median differs from national. That is the bug fix. Expect visible score shifts on UK location pages; ISR caches refresh within 24h.
- **Cost:** Algolia search requests drop. Baseline reads move to Firestore, which the in-memory cache bounds to a few hundred reads per instance per TTL.
- **No new runtime dependencies** (`algoliasearch` and `firebase-admin` are already server deps).
