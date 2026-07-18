## Context

The Am I Underpaid admin dashboard currently displays a log of searches performed by users across the platform. While the inputs (title, location, target salary, etc.) are captured upon form submission, the resultant benchmark outcomes (MCA score, market average, government average) are calculated dynamically on the results page after the initial tracking event has completed. Without these outcomes, the admin search log lacks critical context about whether users are receiving accurate data or if they are wildly over/underpaid.

## Goals / Non-Goals

**Goals:**

- Provide a robust way to securely associate a search request with its final data payload without blocking user navigation.
- Capture the state of whether a search found any results using a `search_success` flag.
- Ensure the admin dashboard seamlessly displays the new metrics for incoming searches.
- Provide a robust mechanism in the admin panel to retrospectively backfill historical searches.

**Non-Goals:**

- We are not automatically triggering the backfill script on app load; it must be manually initiated by an admin clicking the backfill button.

## Decisions

**Decision 1: Client-Side UUID Generation vs Server-Returned ID**

- _Choice_: Generate the `searchId` client-side using `crypto.randomUUID()` in the frontend `useUserLogging` composable.
- _Rationale_: Generating the ID on the client allows the application to fire a 'fire-and-forget' fetch request to track the initial search and immediately `navigateTo` the results page, passing the `searchId` via Nuxt `useState`. If we waited for the server to return an ID, it would introduce noticeable latency to the user's search navigation.

**Decision 2: Stateful Session Storage**

- _Choice_: Use Nuxt's `useState('currentSearchId')` to ferry the ID from the search form component to the results page component.
- _Rationale_: Since the site uses Vue SPA navigation, state is preserved between the route change. This avoids polluting the URL with query parameters (e.g., `?searchId=xyz`) which are ugly and prone to being shared incorrectly by users.

**Decision 3: Upsert Logic on the Backend**

- _Choice_: Modify `server/api/user/track-search.post.ts` to accept an explicit `id` and use `doc(id).set(data)` instead of `.add()`.
- _Rationale_: This guarantees that if the client passes an ID, the initial search logic sets that exact document ID in Firestore. The subsequent `update-search` API will then target that same ID using `doc(id).update()`.

**Decision 4: Historical Backfill Implementation**

- _Choice_: Introduce `/api/admin/backfill-searches.post.ts`. It iterates over `search_history` documents missing an MCA score, leverages the Adzuna cache and the Government API module to fetch values manually, recalculates the MCA, and flags the document with `historical_fetched_MCA: true`.
- _Rationale_: Reconstructing the data retroactively uses cached Adzuna logic to avoid burning premium API credits. Tagging the document explicitly allows analysts to differentiate between real-time data and retroactively calculated data.

## Risks / Trade-offs

- [Risk] If a user shares the URL of a results page, `useState` will be empty, so no `update-search` will fire on page load for the visitor.
  - _Mitigation_: This is intentional. The visitor is viewing a static link, they didn't actively "perform a search".
- [Risk] `crypto.randomUUID()` requires a secure context (HTTPS/localhost).
  - _Mitigation_: The application runs on HTTPS in production and localhost in dev, so this API is guaranteed to exist.
