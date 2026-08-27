## Why

During a performance audit of the `useLocationEngine` data orchestration flow, two highly redundant, zero-downside Algolia searches were identified.

1. The identical national `salary_benchmarks` record is fetched twice in sequence during the USA flow (once by `useMarketData` to resolve identity, and immediately again by `useMicroData`).
2. Both `useMacroData` and `useMicroData` fetch ~400 regional records to answer the "no location given" scenario, throwing the data away instantly since there is no target location to look up.

This proposal eliminates these wasteful queries without altering any underlying application behavior, drastically reducing Algolia operations per page load. (Note: Caching is deliberately out of scope for this change).

## What Changes

**1. Threading Prefetched Hits (Finding 1)**

- `useMarketData.ts` will expose a new `matchedBenchmarkHit` ref.
- When `resolveUsaIdentity` (or `resolveUkIdentity`'s fallback path) searches the `salary_benchmarks` index, it will store the full returned hit in this ref, instead of throwing away everything except the `id_code` and `title`.
- `useLocationEngine.ts` will pass this prefetched hit into `useMicroData.fetchMicroBaselines`.
- `useMicroData.ts` will check for this hit. If provided, it will skip its own `nationalQuery` completely and use the prefetched data.

**2. Bypassing Regional Queries (Finding 2)**

- In both `useMacroData.fetchMacroBaselines` and `useMicroData.fetchMicroBaselines`, we will check if the `location` argument is falsy.
- If it is falsy (empty string or undefined), we will skip executing the `regionalQuery` entirely and resolve immediately with an empty array of hits, saving a 1000-hit-limit query.

**3. Unit Test Coverage**

- We will update the existing `useMarketData.spec.ts`, `useMicroData.spec.ts`, and `useMacroData.spec.ts` files to explicitly assert that Algolia's `search` method is _not_ called when the location is falsy or when the prefetched hit is provided.

## Capabilities

### Modified Capabilities

- `market-data-resolution`: Exposing the full hit from `salary_benchmarks` queries.
- `micro-data-fetching`: Skipping national queries when a hit is provided; skipping regional queries when no location is provided.
- `macro-data-fetching`: Skipping regional queries when no location is provided.

## Impact

- `app/composables/useMarketData.ts`
- `app/composables/useMicroData.ts`
- `app/composables/useMacroData.ts`
- `app/composables/useLocationEngine.ts`
- `app/composables/tests/useMarketData.spec.ts`
- `app/composables/tests/useMicroData.spec.ts`
- `app/composables/tests/useMacroData.spec.ts`
