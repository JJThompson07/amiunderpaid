## Context

To keep Algolia within the free tier, we are focusing on the most heavily utilized endpoints: the autocomplete functions in `useJobAutocomplete.ts`.

## Goals / Non-Goals

**Goals:**

- Eliminate redundant API calls for previously searched strings.
- Reduce mid-word searches.

**Non-Goals:**

- Caching data persistently across user sessions (an in-memory Map scoped to the Vue app instance is sufficient and prevents stale data).

## Decisions

- **Debounce:** Increase `useDebounceFn` delay from 300ms to 500ms.
- **Cache Structure:**
  - We will define two Maps _outside_ the composable function body so they persist across component mounts/unmounts within the same SPA session:
    - `const titleCache = new Map<string, AutocompleteOption[]>();`
    - `const locationCache = new Map<string, AutocompleteOption[]>();`
  - The cache key MUST incorporate the country and any active filters (e.g., `UK:softw` or `USA:softw:searchLocation=london`).
- **Cache Hit Logic:**
  - Before calling Algolia, check if `cache.has(key)`.
  - If yes, assign `options.value = cache.get(key)`, skip Algolia, and return.
  - If no, call Algolia, populate the cache `cache.set(key, results)`, and return.

## Risks / Trade-offs

- **Risk:** Cache unbounded memory growth.
  - **Mitigation:** Since the cache is scoped to a single user's browser session (SPA lifecycle), the memory footprint of storing a few dozen string arrays is negligible.
- **Risk:** 500ms feels sluggish.
  - **Mitigation:** 500ms is standard for type-ahead debounce; 300ms is often too fast for average typing speeds.
