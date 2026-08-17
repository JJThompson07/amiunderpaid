## 1. Composable Optimization

- [x] 1.1 Update `app/composables/useJobAutocomplete.ts` to implement the `titleCache` and `locationCache` Maps outside the function scope.
- [x] 1.2 Update `fetchTitles` in `useJobAutocomplete.ts` to construct a cache key, check the cache, update the debounce to 500ms, and store results.
- [x] 1.3 Update `fetchLocations` in `useJobAutocomplete.ts` to construct a cache key, check the cache, update the debounce to 500ms, and store results.

## 2. Testing & Verification

- [x] 2.1 Update `app/composables/tests/useJobAutocomplete.spec.ts` to mock the 500ms timing and write assertions ensuring that cache hits avoid calling the Algolia SDK.
- [x] 2.2 Run local verification `pnpm vitest run` and `pnpm test:e2e` to ensure all tests pass and coverage is maintained above 80%.
