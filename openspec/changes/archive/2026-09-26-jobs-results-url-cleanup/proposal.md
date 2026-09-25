# Proposal

## Why

**Messy jobs search results URLs.** When a user performs a search from the shared search form (`BaseSearchForm.vue`), form fields like `q`, `gov_id`, `schedule`, `contract`, and `category` are attached as query parameters during the initial navigation (`/jobs/software-engineer/uk?q=Software+Engineer&gov_id=...&schedule=full-time&contract=permanent...`).

On the salary results page (`app/pages/salary/[title]/[country]/[[location]].vue`, lines 390-398) and benchmark results page (`app/pages/benchmark/[title]/[country]/[[location]].vue`, lines 335-343), an `onMounted` hook immediately cleans up the address bar via `navigateTo({ path: route.path, query: compare ? { compare } : undefined }, { replace: true })`, presenting a clean, shareable URL path (e.g. `/salary/software-engineer/uk`).

The jobs results page (`app/pages/jobs/[title]/[country]/[[location]].vue`) currently lacks this `onMounted` cleanup hook. As a result, search-form query parameters remain permanently in the browser URL bar. Furthermore, the search state (`q`, `schedule`, `contract`, `category`) is read once into non-reactive refs at setup in `app/composables/useJobSearchEngine.ts` (lines 93-103), and `gov_id` is unused in jobs mode, so stripping transient search query parameters on mount preserves all derived state while maintaining a clean, consistent URL experience across all results pages.

## What Changes

- **Jobs Results Page Query Cleanup**: Add an `onMounted` lifecycle hook in `app/pages/jobs/[title]/[country]/[[location]].vue` that strips transient search-form query parameters (`q`, `gov_id`, `schedule`, `contract`, `category`, `period`) using `navigateTo({ path: route.path, query: sort ? { sort } : undefined }, { replace: true })`.
- **Preserve Sort Parameter**: If a `sort` query parameter exists (e.g., deep-linked or user-toggled), preserve it while stripping transient form inputs.
- **E2E Test Assertion**: Update/add an end-to-end test in `e2e/job-search.spec.ts` asserting that after search submission, the client-side navigation cleans the address bar to `/jobs/software-engineer/uk` (and `/jobs/software-engineer/uk?sort=salary_max` upon sorting).

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `live-job-search`: Update the dedicated job search routes requirement to mandate client-side query parameter cleanup on the results page after mounting, stripping transient search-form parameters while preserving active sort parameters.

## Impact

- `app/pages/jobs/[title]/[country]/[[location]].vue`: Add `onMounted` import and cleanup hook.
- `e2e/job-search.spec.ts`: Add explicit assertions verifying query parameter stripping and clean URL shape after client-side search execution and sorting.
- `openspec/specs/live-job-search/spec.md`: Delta spec updating requirement and scenarios for URL cleanliness on the jobs results page.
- No changes to API routes, database schemas, or external dependencies.
