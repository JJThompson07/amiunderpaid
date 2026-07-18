## Why

The admin search logs table currently only captures the initial parameters of a user's search. It does not display the results of that search, specifically the `MCA_score`, `market_average`, and `government_average`. By capturing and displaying these data points, administrators can gain deeper insight into the exact market data and verdicts that users are seeing, rather than just knowing what keywords they searched for.

Because these averages are calculated after the initial search is submitted (during the data fetching phase on the results page), we need to introduce a mechanism to update the original search log record with these values once they become available.

## What Changes

- Add a new API endpoint (`/api/user/update-search`) to handle updating an existing search log with the newly calculated scores and averages.
- Modify the existing search tracking logic (`/api/user/track-search`) to accept an explicitly passed document ID, rather than auto-generating one.
- Update the frontend tracking service (`useUserLogging`) to generate a unique `searchId` client-side, pass it to the initial `track-search` request, and store it for the current session.
- Trigger the new `update-search` API from the results page once the `MCA_score`, `market_average`, and `government_average` are loaded.
- Capture a `search_success` boolean flag, which is false if the search yields no results (metrics remain N/A).
- Update the Admin Search Logs table UI (`app/pages/admin/search-logs.vue`) to display these new data columns, as well as a new "Backfill Historical" button.
- Create an admin backend script (`/api/admin/backfill-searches.post.ts`) to recalculate historical searches by fetching from the Adzuna cache and government data, updating the logs with `historical_fetched_MCA: true`.

## Capabilities

### New Capabilities

- `admin-search-log-metrics`: Capturing and displaying post-search metrics (MCA score, market average, government average) in the admin search logs.

### Modified Capabilities

- (None existing)

## Impact

- **Database**: The `search_history` Firestore collection documents will now include three optional fields: `mcaScore`, `marketAverage`, and `governmentAverage`, alongside boolean flags `search_success` and `historical_fetched_MCA`.
- **Frontend Tracking**: `useUserLogging.ts` will manage a client-side generated UUID to link initial search events with their subsequent result loads.
- **Admin UI**: The search logs table will widen to accommodate the new columns, and a backfill tool will be added for historical parity.
