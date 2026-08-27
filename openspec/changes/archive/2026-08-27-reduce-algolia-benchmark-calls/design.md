## Overview

This refactor focuses strictly on preventing Algolia query inflation. It requires careful state management to ensure that a prefetched hit from one resolution is never accidentally reused by a subsequent, disparate request (stale hit).

## Key Decisions

**1. State Threading**

- _Decision_: Expose `matchedBenchmarkHit: Ref<SalaryBenchmark | null>` from `useMarketData`.
- _Rationale_: By keeping this in the same state object as `matchedIdCode`, it naturally aligns with the resolution lifecycle.
- _Strict Constraint_: We must update `resetIdentity()` inside `useMarketData.ts` to explicitly set `matchedBenchmarkHit.value = null`. We must also explicitly set it to `null` on the Exact ID bypass branch and the UK dictionary success branch. It MUST only be populated when we actually searched the `salary_benchmarks` index.

**2. Passing State to `useMicroData`**

- _Decision_: Modify the `fetchMicroBaselines` signature to `(..., prefetchedHit?: SalaryBenchmark | null)`.
- _Rationale_: `useLocationEngine` is the sole orchestrator. Passing it explicitly via argument keeps `useMicroData` functionally pure and agnostic of `useMarketData`'s internal state.

**3. Conditionally Executing Regional Queries**

- _Decision_: Use standard `if (!userLocation) { return Promise.resolve({ hits: [] }); }` style bypasses.
- _Rationale_: Replaces the unconditional execution of `regionalIndex.search(...)`. This guarantees that if the frontend route has no location, no Algolia credits are burned fetching the 400 region documents.

**4. Testing Strategy**

- _Decision_: Assert against `mockSearchClient.search` calls.
- _Rationale_: The adjacent unit tests (`app/composables/tests/*`) already mock the `$algolia` client. We will add test cases specifically asserting that `expect(mockIndex.search).toHaveBeenCalledTimes(0)` when `userLocation` is null/empty for regional queries, and similarly for the national query when `prefetchedHit` is passed.
