# Proposal: Rename Provider API and Composable

## 1. Problem Statement

The current application uses a backend fallback pattern (API Gateway) where the backend automatically catches rate limits on Adzuna and falls back to Reed. However, the frontend API endpoints and composable are strictly named `adzuna` (e.g. `/api/adzuna/jobs` and `useAdzuna`). When testing the Reed fallback, the network tab shows requests going to an `adzuna` named endpoint but receiving `reed` data, which can be very confusing for future developers.

## 2. Proposed Solution

Rename the frontend-facing API endpoints and composable to be provider-agnostic, representing their true role as the unified entry points for market data. This maintains the performance of the server-side fallback while dramatically improving code readability. We will also add comments explaining the backend fallback logic.

## 3. Scope

- Rename `server/api/adzuna/jobs.ts` to `server/api/jobs/search.ts`
- Rename `server/api/adzuna/salary.ts` to `server/api/salary/search.ts`
- Rename `app/composables/useAdzuna.ts` to `app/composables/useMarketData.ts` (or `useJobs.ts`)
- Update imports across Vue components.
- Add descriptive code comments indicating that the endpoint/composable fetches market data and intelligently falls back to secondary providers if primary providers fail.

## 4. Non-Goals

- Changing the actual API response schema.
- Changing the backend fallback logic itself (this is purely a naming and documentation update).
