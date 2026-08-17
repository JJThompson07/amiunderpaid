# Algolia Quota Optimization

## MODIFIED `app/composables/useJobAutocomplete.ts`

- **Behavior**: Define `const titleCache = new Map<string, AutocompleteOption[]>()` outside the `useJobAutocomplete` function export.
- **Behavior**: Define `const locationCache = new Map<string, AutocompleteOption[]>()` outside the `useJobAutocomplete` function export.
- **Behavior**: Update `fetchTitles` debounce delay from `300` to `500`.
- **Behavior**: Inside `fetchTitles`, construct a cache key combining `country`, the trimmed search value, and `currentLocation` (to ensure USA regional searches don't bleed across different location contexts).
- **Behavior**: If `titleCache.has(key)`, set `titleOptions.value = titleCache.get(key)!` and return immediately without setting `fetching.value = true`.
- **Behavior**: If cache miss, fetch from Algolia, assign to `titleOptions.value`, and then `titleCache.set(key, titleOptions.value)`.
- **Behavior**: Update `fetchLocations` debounce delay from `300` to `500`.
- **Behavior**: Inside `fetchLocations`, construct a cache key combining `country`, the trimmed search value, and `currentTitle` (to ensure USA regional searches don't bleed across different job title contexts).
- **Behavior**: If `locationCache.has(key)`, set `locationOptions.value = locationCache.get(key)!` and return immediately.
- **Behavior**: If cache miss, fetch from Algolia, assign to `locationOptions.value`, and then `locationCache.set(key, locationOptions.value)`.

## MODIFIED `app/composables/tests/useJobAutocomplete.spec.ts`

- **Behavior**: Update existing tests if they relied on a hardcoded 300ms timing.
- **Behavior**: Add a test verifying that calling `fetchTitles` twice with the exact same inputs only calls the Algolia search client once (proving the cache works).
- **Behavior**: Add a test verifying that calling `fetchTitles` with the same string but a different `country` or `currentLocation` correctly bypasses the cache and calls Algolia again.
