## 1. Modify `useMarketData`

- [x] 1.1 In `app/composables/useMarketData.ts`, define `const matchedBenchmarkHit = useState<SalaryBenchmark | null>('market_matched_hit', () => null);` and add it to the composable's returned object.
- [x] 1.2 Update the `resetIdentity` function to set `matchedBenchmarkHit.value = null`.
- [x] 1.3 In `resolveUkIdentity`, under the "EXACT ID BYPASS" block, set `matchedBenchmarkHit.value = null`. Under the "SET THE IDENTITY IF FOUND IN DICTIONARY" block, set `matchedBenchmarkHit.value = null`. Under the "FALLBACK: DIRECT BENCHMARK SEARCH" block, set `matchedBenchmarkHit.value = bestBenchmarkMatch || null`.
- [x] 1.4 In `resolveUsaIdentity`, under the "EXACT ID BYPASS" block, set `matchedBenchmarkHit.value = null`. Under the "TEXT SEARCH THE MASTER INDEX" block, set `matchedBenchmarkHit.value = bestBenchmarkMatch || null`.

## 2. Modify `useMicroData`

- [x] 2.1 In `app/composables/useMicroData.ts`, update the signature of `fetchMicroBaselines` to accept an optional 5th parameter: `prefetchedHit?: SalaryBenchmark | null`.
- [x] 2.2 Wrap the `nationalQuery` assignment. If `prefetchedHit` exists, `const nationalQuery = Promise.resolve({ hits: [prefetchedHit] });`. Otherwise, execute the existing `nationalIndex.search(...)`.
- [x] 2.3 Wrap the `regionalQuery` assignment. If `!userLocation`, `const regionalQuery = Promise.resolve({ hits: [] });`. Otherwise, execute the existing `regionalIndex.search(...)`.

## 3. Modify `useMacroData`

- [x] 3.1 In `app/composables/useMacroData.ts`, wrap the `regionalQuery` assignment. If `!location`, `const regionalQuery = Promise.resolve({ hits: [] });`. Otherwise, execute the existing `regionalIndex.search(...)`.

## 4. Update Orchestrator (`useLocationEngine`)

- [x] 4.1 In `app/composables/useLocationEngine.ts`, update the `microData.fetchMicroBaselines` call inside the `Promise.all`. Pass `marketData.matchedBenchmarkHit.value` as the 5th argument.

## 5. Update Unit Tests

- [x] 5.1 In `app/composables/tests/useMarketData.spec.ts`, assert that `matchedBenchmarkHit` is properly populated when a direct benchmark search succeeds (for both USA and UK fallback), and assert that it is properly cleared/nullified during an exact ID bypass or UK dictionary match.
- [x] 5.2 In `app/composables/tests/useMicroData.spec.ts`, add a test asserting that `nationalIndex.search` is _not_ called when `prefetchedHit` is provided. (Required restructuring this file's Algolia mock to split national/regional search mocks per index name, mirroring `useMacroData.spec.ts` — the prior single shared `search` mock couldn't distinguish which index was called.)
- [x] 5.3 In `app/composables/tests/useMicroData.spec.ts` and `app/composables/tests/useMacroData.spec.ts`, add tests specifically for the "no location provided" path, asserting that `regionalIndex.search` is _not_ called when the location argument is empty/falsy.

## 6. Verification

- [x] 6.1 Run the full verification suite to ensure zero regressions across the codebase:
  - `pnpm lint` (to verify formatting, spelling, and standards)
  - `pnpm test` (to verify unit tests pass)
  - `pnpm test:coverage` (to verify 80% coverage is maintained)
  - `pnpm test:e2e` (to verify Playwright browser tests pass)
