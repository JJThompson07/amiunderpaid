# Design

## Context

See `proposal.md` for motivation and background.

The shared search form (`app/components/BaseSearchForm.vue`, `executeNavigation` lines 420-478) navigates to results routes with search-form query parameters (`q`, `gov_id`, `schedule`, `contract`, `compare`, `period`, `category`).

On the salary results page (`app/pages/salary/[title]/[country]/[[location]].vue`, lines 390-398) and benchmark results page (`app/pages/benchmark/[title]/[country]/[[location]].vue`, lines 335-343), an `onMounted` lifecycle hook cleans up the address bar via:

```typescript
onMounted(() => {
  const { compare, ...remainingQuery } = route.query;
  if (Object.keys(remainingQuery).length > 0) {
    navigateTo(
      { path: route.path, query: compare ? { compare: compare } : undefined },
      { replace: true }
    );
  }
});
```

The jobs results page (`app/pages/jobs/[title]/[country]/[[location]].vue`) does not yet include this lifecycle hook, leaving all search parameters permanently in the address bar.

## Goals / Non-Goals

**Goals:**

- Strip transient search-form query parameters (`q`, `gov_id`, `schedule`, `contract`, `category`, `period`) on client mount on `/jobs/[title]/[country]/[[location]]`.
- Preserve any active `sort` query parameter if present.
- Ensure that sorting via the UI sort tabs continues to produce clean URLs like `?sort=salary_max`.
- Verify behavior via Playwright end-to-end tests.

**Non-Goals:**

- Changing `BaseSearchForm.vue`'s navigation logic (query parameters are necessary on initial navigation for SSR and composable setup).
- Changing how `useJobSearchEngine.ts` initializes its internal state.
- Modifying salary or benchmark results pages.

## Decisions

### Decision 1: Use `onMounted` in `app/pages/jobs/[title]/[country]/[[location]].vue`

- **Choice**: Add `onMounted` with `navigateTo({ path: route.path, query: sort ? { sort: sort } : undefined }, { replace: true })` inside `<script setup>` of `app/pages/jobs/[title]/[country]/[[location]].vue`.
- **Rationale**:
  - Matches the established pattern in `app/pages/salary/[title]/[country]/[[location]].vue` (line 390) and `app/pages/benchmark/[title]/[country]/[[location]].vue` (line 335).
  - Client-side execution in `onMounted` runs after Vue hydration, avoiding any hydration mismatches or SSR redirection side-effects.
- **Alternatives Considered**:
  - _Preventing query params in `BaseSearchForm.vue`_: Rejected because `useJobSearchEngine.ts` reads `schedule`, `contract`, `category`, and `q` from `route.query` at setup time during SSR/initial page load. Omitting them from navigation would break filtering.
  - _Cleaning inside `useJobSearchEngine.ts`_: Rejected because composables should avoid trigger-navigating on mount unless they own the full page lifecycle; keeping page-level URL cleanup in page components follows the repo's existing separation of concerns.

### Decision 2: Query Parameter Destructuring & `sort` Preservation

- **Choice**:
  ```typescript
  onMounted(() => {
    const { sort, ...remainingQuery } = route.query;
    if (Object.keys(remainingQuery).length > 0) {
      navigateTo({ path: route.path, query: sort ? { sort: sort } : undefined }, { replace: true });
    }
  });
  ```
- **Rationale**:
  - If a user deep-links to `/jobs/software-engineer/uk?sort=salary_max` (or shares a sorted link), preserving `sort` retains their intended sort preference in the URL.
  - If no transient search-form parameters exist (e.g. direct navigation to a clean URL), `Object.keys(remainingQuery).length === 0`, and no redundant navigation occurs.
  - If transient search-form parameters are present (`q`, `gov_id`, etc.) and `sort` is undefined, `query` is `undefined`, completely removing the query string.

### Decision 3: Interaction with Sort Tabs Watcher

- In `app/composables/useJobSearchEngine.ts` (line 146):
  ```typescript
  watch(sortMode, (newMode) => {
    navigateTo({ query: { ...route.query, sort: newMode } }, { replace: true });
  });
  ```
- Because `onMounted` cleans `route.query` down to at most `{ sort }`, subsequent sort changes via the tab controls naturally replace the query with only `{ sort: newMode }`, eliminating any risk of zombie search params reappearing.

## Risks / Trade-offs

| Risk                                              | Mitigation                                                                                                                                                                                                               |
| :------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search filters lost on client-side state          | `useJobSearchEngine.ts` reads `jobType`, `contractType`, `category`, and `searchTitle` once at setup time into Vue `ref`s (lines 93-103). These refs retain their values regardless of subsequent `route.query` cleanup. |
| Unnecessary URL replacements on direct/clean hits | Guarded with `if (Object.keys(remainingQuery).length > 0)`, so direct visits to clean paths or purely sorted paths do not trigger unnecessary router replacements.                                                       |
| E2E test regressions                              | E2E test assertions in `e2e/job-search.spec.ts` already test `toHaveURL(/\/jobs\/software-engineer\/uk/i)` and `toHaveURL(/sort=salary_max/)`. We will add an explicit assertion to lock in the clean URL behavior.      |
