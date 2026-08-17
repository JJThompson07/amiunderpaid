# Phase 4: Performance Optimizations

## Why
This phase focuses on optimizing Firestore queries and Nitro endpoints to significantly reduce read costs and improve Time To First Byte (TTFB) for users. Currently, some queries run unbounded or without cursors, scanning thousands of unneeded documents and pushing data transfer limits. Additionally, API fallback chains lack proper Nitro caching, forcing redundant downstream API requests under high load.

## What
- Denormalize the `territory_category_owners` data so `useRecruiterCards` only performs a single document read instead of fetching all recruiters.
- Remove massive unused JSON payloads (`allRegionalData` and `allRegionalMicroData`) from the Nuxt payload state in `useLocationEngine.ts`.
- Cache the `sitemap.xml` endpoint for 24 hours (`swr: 86400`) and push the country filter to the database query.
- Add pagination (`limit(50)` with cursors) to the recruiter leads table.
- Implement Nitro `cachedFunction` in the `jobs.ts` and `salary.ts` market-data endpoints to deduplicate concurrent requests.
- Reduce default cache stale time from 120 days to a more realistic window, surfacing staleness in the UI.
- Add `startAfter()` cursors and index searches in Algolia for the `search-logs.get.ts` endpoint.

## Scope
Touches `server/api/`, Nuxt global state, and Firestore query structures.

## Non-Goals
- Full architectural migrations (e.g., migrating away from Firestore entirely).
- UI redesigns beyond surfacing a "data as of" timestamp.
