# Reduce Algolia Benchmark Calls

### `app/composables/useMarketData.ts`

- **Behavior**: Expose `matchedBenchmarkHit: Ref<SalaryBenchmark | null>` from the composable's returned object, backed by `useState<SalaryBenchmark | null>('market_matched_hit', () => null)`.
- **Behavior**: `resetIdentity()` sets `matchedBenchmarkHit.value = null`.
- **Behavior**: In `resolveUkIdentity`, the "EXACT ID BYPASS" branch and the "SET THE IDENTITY IF FOUND IN DICTIONARY" branch both set `matchedBenchmarkHit.value = null` (neither path searches `salary_benchmarks`, so there is no hit to reuse). The "FALLBACK: DIRECT BENCHMARK SEARCH" branch sets `matchedBenchmarkHit.value = bestBenchmarkMatch || null`.
- **Behavior**: In `resolveUsaIdentity`, the "EXACT ID BYPASS" branch sets `matchedBenchmarkHit.value = null`. The "TEXT SEARCH THE MASTER INDEX" branch sets `matchedBenchmarkHit.value = bestBenchmarkMatch || null`.

### `app/composables/useMicroData.ts`

- **Behavior**: `fetchMicroBaselines` accepts an optional 5th parameter `prefetchedHit?: SalaryBenchmark | null`.
- **Behavior**: If `prefetchedHit` is provided, `nationalQuery` resolves immediately to `{ hits: [prefetchedHit] }` instead of calling `nationalIndex.search(...)` — avoids re-querying `salary_benchmarks` for a record `useMarketData` already fetched by `id_code`.
- **Behavior**: If `userLocation` is falsy, `regionalQuery` resolves immediately to `{ hits: [] }` instead of calling `regionalIndex.search(...)` (which would otherwise fetch up to 1000 regional records that are discarded).

### `app/composables/useMacroData.ts`

- **Behavior**: In `fetchMacroBaselines`, if `userLocation` is falsy, `regionalQuery` resolves immediately to `{ hits: [] }` instead of calling `regionalIndex.search(...)`.

### `app/composables/useLocationEngine.ts`

- **Behavior**: The `microData.fetchMicroBaselines` call passes `marketData.matchedBenchmarkHit.value` as the 5th argument, threading the identity-resolution hit into the micro-baseline fetch.

### Tests

- **Behavior**: `app/composables/tests/useMarketData.spec.ts` asserts `matchedBenchmarkHit` is populated when a direct benchmark search succeeds (USA path, UK fallback path) and is nulled on an exact ID bypass or UK dictionary match.
- **Behavior**: `app/composables/tests/useMicroData.spec.ts` asserts `nationalIndex.search` is not called when `prefetchedHit` is provided, and that `regionalIndex.search` is not called when `userLocation` is falsy.
- **Behavior**: `app/composables/tests/useMacroData.spec.ts` asserts `regionalIndex.search` is not called when `userLocation` is falsy.
