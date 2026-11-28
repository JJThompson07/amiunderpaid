## Context

Today's pipeline, all running inside `useAsyncData` in `useLocationEngine`:

1. `useJobs.fetchJobs` + `fetchHistogram` call `/api/market-data/{jobs,salary}`. These are server routes with provider fallback and Firestore caching (`adzuna_jobs_cache`, `adzuna_distribution_cache`; renamed to `market_jobs_cache`, `market_distribution_cache` in `remove-adzuna-official-industry-trends`).
2. `useMarketData.resolveUkIdentity` searches Algolia `job_titles` (UK) and falls back to `salary_benchmarks`; `resolveUsaIdentity` searches `salary_benchmarks`. Ambiguous UK hits across more than one group fill `ambiguousMatches`.
3. `useMacroData` reads the national all-employees record plus all regional all-roles records (`hitsPerPage: 1000`) from Algolia.
4. `useMicroData` reads the occupation's national record and its regional records by `id_code`.
5. `calculate{UK,USA}BenchmarkScore(EngineContext)` → `formatMcaScoreForUi(…, t)`.

Firestore holds the same benchmark records as Algolia. The admin seeder writes both from `app/pages/admin/seed.vue`, with `searchTitle` / `searchLocation` lowercased, and Firestore keeps every year whereas Algolia regional keeps only the newest. `uk_job_groups` is the full SOC 2020 hierarchy, with 499 docs keyed by SOC code and 28,277 synonyms in `titles`. `server/api/engine/match-title.get.ts` already does the exact-synonym lookup.

## Goals / Non-Goals

**Goals:**

- One engine, callable from any Nitro route, that produces the same `EngineContext` the scorers take today.
- SOC is the key at every layer. Fuzzy text matching happens only once, at resolution.
- The engine's output is deterministic for a given (country, SOC, location, data year), apart from the live tier.

**Non-Goals:**

- Moving `formatMcaScoreForUi` server-side. It's presentation and depends on vue-i18n.

## Decisions

### D1. Layout: `server/utils/engine/`

| Module                | Responsibility                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `types.ts`            | `RoleResolution`, `Baselines`, `EngineInput`, `EngineOutput`                                                                               |
| `resolveRole.ts`      | `resolveRole({ country, title?, soc?, strict? })` and `findSynonymMatches(country, title)`, the latter extracted from `match-title.get.ts` |
| `baselines.ts`        | `getMacroBaselines(country, location?)`, `getMicroBaselines(country, soc, location?)`, plus the cache                                      |
| `computeBenchmark.ts` | `computeBenchmark(event, input)`: resolve, then baselines ∥ live, then score                                                               |

Nitro auto-imports `server/utils/**`, but only at the top level. Files in a subfolder need explicit imports, which keeps the engine's surface deliberate.

### D2. Resolution cascade

```
soc supplied ─► exists in {uk,usa}_job_groups (doc id)?  ─yes─► method 'soc', confidence 1
     │no / not supplied
title ─► exact synonym (titles array-contains, lowercased) ─1 hit─► method 'synonym', confidence 0.95
     │                                                      ─>1 hits─► best = first, alternatives = rest
     │0 hits
     ▼
fuzzy (Algolia job_titles UK / salary_benchmarks USA, ported from useMarketData incl. "Title (Group)" parsing)
     ─hit─► method 'fuzzy', confidence = 0.6 (0.8 if a "(Group)" suffix matched), alternatives ≤ 5 distinct groups
     │none
     ▼
method 'generic', soc null (strict=true ⇒ caller turns this into a 404/422)
```

The fuzzy step uses a server Algolia client built from the private runtime config. A new private key `algoliaSearchApiKey` is registered in `nuxt.config.ts`, taken from the existing `ALGOLIA_SEARCH_API_KEY` env var. The engine never needs write access, so it doesn't reuse `algoliaAdminApiKey` (least privilege).

Confidence values are fixed constants in `types.ts`. They're a signal for the API and the ambiguity modal, not a probability.

### D3. Baselines from Firestore, single year, cached

- **Query shape:** equality-only filters (`country ==`, `id_code ==` or `searchTitle ==`, `searchLocation ==`), so no composite index is needed. The repo has no `firestore.indexes.json`, and Firestore merges single-field indexes for equality-only queries.
- **Year selection** happens in memory with the existing `pinToSingleYear` from `shared/utils/benchmarkYear.ts`. That preserves the "One data year per result" requirement.
- **Macro national:** `salary_benchmarks` where `country == 'UK'`, `searchTitle == 'all employees'`, `searchLocation == 'united kingdom'`. USA: `id_code == '00-0000'`.
- **Macro regional (the fix):** `regional_salary_benchmarks` where `country == 'UK'`, `searchTitle == 'all'`, `searchLocation == <location lowercased>`. USA: `id_code == '00-0000'` and the location.
- **Micro:**
  - National: `salary_benchmarks` where `country`, `id_code == soc`.
  - Regional: `regional_salary_benchmarks` where `country`, `id_code == soc`, `searchLocation == location`.
  - For the UK regional query this returns nothing until Table 15 lands. That's intended.
- **Cache:** a module-level `Map<key, { value, expiresAt }>` with a 6h TTL and at most 2,000 entries. On write, expired entries are swept; if the map is still at 2,000, the oldest insertion is evicted (FIFO: `map.delete(map.keys().next().value)`). This adds a hard cap that `server/middleware/rate-limit.ts` (which only prunes expired entries) doesn't have. Benchmarks change only when an admin seeds, roughly once a year, and in-memory staleness is bounded by the TTL. An admin "clear cache" isn't needed: Vercel instances recycle well within 6h of a deploy.

Alternative considered: keep the Algolia reads on the server. Rejected per the planning decision. Algolia's regional index drops older years, Firestore is the source of truth, and keeping per-request reads off Algolia protects its quota.

### D4. Live tier via Nitro internal `$fetch`

`computeBenchmark` calls `event.$fetch('/api/market-data/salary', { query })`. Nitro routes that in-process, with no network hop. Calling the handler this way keeps its provider fallback, Firestore cache and `cachedFunction` stampede guard exactly as they are, without extracting ~350 lines of handler logic. (Once `remove-adzuna-official-industry-trends` lands, `/api/market-data/salary` returns `{ histogram, mean, count, provider }` for Reed in the UK and Careerjet → Jooble in the USA, all computed via `buildTieredJobResponse`, so `computeBenchmark` receives `mean` and `count` directly without needing a separate `/api/market-data/jobs` call.) On failure (a 503 after all providers fail), the live tier is reported as unavailable and the score is computed without it. The scorers already handle `totalLiveJobs: 0`.

### D5. Internal endpoint contract

`GET /api/engine/benchmark?title=&soc=&country=UK|USA&location=&salary=&schedule=&contract=&category=`

- **400** if country is invalid, or if neither title nor soc is given. Messages are opaque per §9.3.
- **Returns** `{ resolution, baselines: { macroNational, macroRegional, microNational, microRegional, dataYear }, live: { histogram, provider, count, mean } | null, score: BenchmarkResult | null }`.
- `score` is null when `salary` is absent or 0, or under the same no-data conditions `useLocationEngine.mcaScore` uses today.
- **Caching:** the internal route isn't itself cached. Baselines are cached in memory (D3) and live data in Firestore (existing), and the page that calls it is ISR-cached at the edge.

### D6. Client switch-over

`useLocationEngine` keeps its public return type (`UseLocationEngineReturn`) so the salary page and its components don't change. Inside `useAsyncData`:

- `useJobs().fetchJobs(...)` stays. Listings are display-only and not part of the engine.
- One `$fetch('/api/engine/benchmark', …)` replaces `fetchHistogram`, `resolveUk/UsaIdentity`, `fetchMacroBaselines` and `fetchMicroBaselines`.
- The response populates `useJobs().distributionData` (same `SalaryDistributionResponse` shape `fetchHistogram` stores, run through `sanitizeAdzunaData` — renamed to `sanitizeMarketData` in `remove-adzuna-official-industry-trends`) and the `useMarketData` state refs (`matchedTitle`, `matchedIdCode`, `isGenericFallback`, `ambiguousMatches`). Every existing computed keeps working.
- `mcaScore` stays a client computed. It calls the scorer locally on the server-returned context, because `userSalary` changes client-side without a refetch (the slider). The engine returns the full `EngineContext` inputs for exactly this reason.

That last point means the scorer still runs in two places (client for interactivity, server for the API) on identical inputs from one source. The scoring function is shared code, so there's still one engine. What moved server-side is the data assembly.

## Risks / Trade-offs

- **[Risk] Score shifts on UK location pages after the regional-modifier fix look like a regression to returning users.**
  → It's the intended correction. The task list includes a before/after table for five UK locations so the change is a known quantity, not a surprise.
- **[Risk] A Firestore read cost spike from cold instances.**
  → Each cold instance pays about 3 reads per distinct (soc, location), with the 2,000-entry cap. At current traffic (about 1.6k logged searches total) this is negligible.
- **[Risk] Fuzzy resolution behaves slightly differently server-side.**
  → The port is line-for-line, and the existing `useMarketData.spec.ts` cases move to `resolveRole.spec.ts` unchanged as regression cases.
- **[Trade-off] The ambiguity modal's alternatives now come from the engine (≤5) rather than the raw ≤10 Algolia hits.**
  → They're deduplicated by group, which is what the modal actually displays.

## Migration Plan

Ship behind no flag. The switch is atomic per deploy, and rollback is a Vercel instant rollback. No data migration.
