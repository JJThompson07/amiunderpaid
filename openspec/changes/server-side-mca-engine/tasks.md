## 1. Pre-flight (verify real state before changing behaviour)

- [ ] 1.1 Re-confirm the regional-modifier bug against live data. Count UK `regional_salary_benchmarks` with `searchTitle:"all employees"` (expect 0) and `searchTitle:"all"` (expect ~782), in both Algolia and Firestore. Record London's and four other UK locations' newest all-roles medians.
- [ ] 1.2 Sample 3 Firestore `salary_benchmarks` docs (UK national, USA national, UK regional) and confirm the field names the engine will query: `country`, `id_code`, `searchTitle`, `searchLocation`, `year`, `salary`, `avg_salary`, `salary_{10,25,75,90}_pt`. If a field differs, update design D3 before writing code.
- [ ] 1.3 Confirm `ALGOLIA_SEARCH_API_KEY` is set in Vercel Production and Preview env, by name only (`vercel env ls`). Never print values.
- [ ] 1.4 Build a "before" table: run 5 UK location searches (London, Manchester, Edinburgh, Cardiff, Cornwall) × 2 roles locally against current `main`, and record the MCA score, modifier and percentiles. Use cached results only; don't re-trigger live provider calls to collect this.

## 2. Engine utilities (code + tests together)

- [ ] 2.1 `server/utils/engine/types.ts`: `RoleResolution`, `ResolutionMethod`, confidence constants, `Baselines`, `EngineInput`, `EngineOutput`.
- [ ] 2.2 `server/utils/engine/resolveRole.ts`. Extract `findSynonymMatches(country, title)` from `server/api/engine/match-title.get.ts`, then add `resolveRole` per design D2: code check by doc id, exact synonym, fuzzy port of `useMarketData.resolveUk/UsaIdentity` with "(Group)" parsing, generic fallback, and up to 5 distinct-group alternatives.
  - Build the server Algolia client from `config.algoliaApplicationId` + `config.algoliaSearchApiKey`.
  - Algolia/Firestore failures fall through to the next tier and are logged without credentials (§9.6).
  - Tests: `server/utils/engine/tests/resolveRole.spec.ts`, covering every cascade branch, an unknown supplied code, ambiguity and Algolia errors. Port the existing `useMarketData.spec.ts` resolution cases as regression cases.
- [ ] 2.3 Register `algoliaSearchApiKey: process.env.ALGOLIA_SEARCH_API_KEY` in private `runtimeConfig` in `nuxt.config.ts` (§9.2).
- [ ] 2.4 Refactor `server/api/engine/match-title.get.ts` to call `findSynonymMatches`. Keep its response shape; update `server/api/engine/tests/`.
- [ ] 2.5 `server/utils/engine/baselines.ts`: `getMacroBaselines`, `getMicroBaselines` per design D3. Use equality-only Firestore queries and `pinToSingleYear`; UK regional macro reads `searchTitle == 'all'`. Add the bounded TTL cache (6h, 2,000 entries; on write sweep expired, then FIFO-evict the oldest if still at cap).
  - Tests: `server/utils/engine/tests/baselines.spec.ts`. Cover UK/USA national, the UK regional modifier records, two-year pinning, a missing region, cache hit/expiry/eviction, and a Firestore error (the macro falls back to null, not to the old hard-coded 35,000).
- [ ] 2.6 `server/utils/engine/computeBenchmark.ts`. Resolve, then baselines ∥ live via `event.$fetch('/api/market-data/salary')`, then build `EngineContext` and score with `calculate{UK,USA}BenchmarkScore`.
  - A live failure gives `live: null` and scoring continues.
  - Tests: `server/utils/engine/tests/computeBenchmark.spec.ts`. Cover the full path, the live 503, no salary (score null), no micro and no live (score null), and USA vs UK scorer selection.

## 3. Internal endpoint

- [ ] 3.1 `server/api/engine/benchmark.get.ts` per design D5. Validate `country ∈ {UK, USA}` and title-or-soc, return 400 with an opaque message, and clamp `salary` to a positive finite number.
  - Tests: `server/api/engine/tests/benchmark.get.spec.ts`, covering validation, a success shape and propagation of a misconfiguration (500).

## 4. Client switch-over

- [ ] 4.1 `app/composables/useLocationEngine.ts`: replace `fetchHistogram`, the identity resolvers and the macro/micro fetches with one `$fetch('/api/engine/benchmark')` inside the existing `useAsyncData`. Populate `useJobs().distributionData` (through `sanitizeAdzunaData`, renamed to `sanitizeMarketData` in `remove-adzuna-official-industry-trends`) and the `useMarketData` state refs from the response. Keep `UseLocationEngineReturn` unchanged. `mcaScore` still calls the scorer client-side, from the returned context plus the live `userSalary`.
  - Update `app/composables/tests/useLocationEngine.spec.ts`, mocking `$fetch` for the endpoint. Cover the score path, no-data path, ambiguity alternatives → `ambiguousMatches` and the National redirect watcher.
- [ ] 4.2 `app/composables/useMarketData.ts`: delete `resolveUkIdentity` / `resolveUsaIdentity` and the `$algolia` dependency. Keep the state refs and exported types (`SalaryBenchmark`, `ResolvedJobIdentity`), and update `app/composables/tests/useMarketData.spec.ts`.
- [ ] 4.3 Delete `app/composables/useMacroData.ts`, `app/composables/useMicroData.ts`, `app/composables/tests/useMacroData.spec.ts` and `app/composables/tests/useMicroData.spec.ts`. Grep that nothing else imports them.
- [ ] 4.4 Leave `useLocationEngine`'s `mode` parameter as it is on the branch you start from. `site-separation` owns removing the `'benchmark'` mode, so this change works whichever merges first.

## 5. Suggestion source

- [ ] 5.1 Add `source: 'site'` to `server/api/market-data/update-match.post.ts` writes and `source: 'user'` to `server/api/user/suggestion/index.post.ts`, including the duplicate-increment path. Update both handlers' specs.
- [ ] 5.2 Show `source` (default `'site'` for legacy docs) as a column in `app/pages/admin/user-suggestions.vue`. Admin pages may use hardcoded strings (§6).

## 6. Verification

- [ ] 6.1 Re-run the task 1.4 searches and produce the "after" table. UK modifier ≠ 1.0 where the regional median differs; USA unchanged; UK `microRegional` still null (expected until `uk-geo-economics-ingestion`).
- [ ] 6.2 Manual check with `pnpm dev`: a UK search with a location, a USA search, an ambiguous title (modal still opens) and a no-data title (`NoData` still renders).
- [ ] 6.3 Gate: `pnpm test:verify` passes (lint, typecheck, 80% per-file coverage including every new `server/utils/engine/*.ts`, e2e, rules).
