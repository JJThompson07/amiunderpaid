## 1. Backend Implementation

- [x] 1.1 Create `server/api/user/update-search.post.ts` endpoint that takes an `id`, `mcaScore`, `marketAverage`, `governmentAverage`, and `searchSuccess` to update an existing Firestore document in the `search_history` collection.
- [x] 1.2 Modify `server/api/user/track-search.post.ts` to accept an optional `id` parameter. Update the Firestore insertion logic to use `set()` (with the explicit document ID) if `id` is provided, instead of always using `add()`.
- [x] 1.3 Create an admin backend script `server/api/admin/backfill-searches.post.ts` that fetches historical `search_history` documents missing an MCA score, matches them with cached Adzuna/Gov data, recalculates the metrics, and updates the document with `historical_fetched_MCA: true`.

## 2. Frontend Services & State Management

- [x] 2.1 Update `app/composables/useUserLogging.ts` so that `logSearch` generates a UUID, attaches it to the `/api/user/track-search` payload, and returns the generated UUID.
- [x] 2.2 Add a new function `updateSearchLog` inside `useUserLogging.ts` that triggers the `/api/user/update-search` endpoint.

## 3. UI Component Updates

- [x] 3.1 In `app/components/Section/AmI/SalarySearch.vue` and `app/components/Section/Benchmark/RoleSearch.vue`, capture the UUID returned by `logSearch` and store it in Nuxt's `useState('currentSearchId')`.
- [x] 3.2 In `app/pages/salary/[title]/[country]/[[location]].vue` and `app/pages/benchmark/[title]/[country]/[[location]].vue`, add a watcher for the calculated averages that triggers `updateSearchLog` using the ID from `useState('currentSearchId')` (and passes `searchSuccess: true` if data is found, `false` otherwise), and then clears the state to prevent duplicate triggers.
- [x] 3.3 Update the Admin Search Logs table (`app/pages/admin/search-logs.vue`) to include columns for MCA Score, Market Average, Government Average, and flags for `historical_fetched_MCA` and `search_success`.
- [x] 3.4 Add a "Backfill Historical" button to the Admin Search Logs header that calls `/api/admin/backfill-searches` and shows a loading state during the operation.
