# Design: Rename Provider API and Composable

## 1. Context
The application utilizes a server-side API Gateway fallback pattern. When the Nuxt server receives a request for job or salary data, it attempts to fetch from Adzuna. If Adzuna rate-limits the request (429 Error), the server seamlessly catches the error, fetches from the Reed API, formats it to match the Adzuna schema, and returns it.

However, the current file naming convention strongly implies that only Adzuna is used:
- `server/api/adzuna/jobs.ts`
- `server/api/adzuna/salary.ts`
- `app/composables/useAdzuna.ts`

To accurately reflect the provider-agnostic nature of the frontend requests, we will rename these files and their corresponding endpoints. We will also add comments explaining the fallback logic, improving clarity for future development.

## 2. Approach

1. **Rename the Composable:**
   - Move `app/composables/useAdzuna.ts` to `app/composables/useJobs.ts`.
   - In the composable, rename the exported function `useAdzuna` to `useJobs`.
   - The composable will update its `$fetch` calls to target `/api/jobs/search` and `/api/salary/search`.
   - A comment will be added to the top of the composable explaining that it calls our Nuxt proxy endpoints which internally manage fetching from Adzuna or falling back to Reed.

2. **Rename the API Endpoints:**
   - Rename the `server/api/adzuna` directory to `server/api/jobs` and `server/api/salary`. Wait, let's keep them grouped logically:
     - Rename `server/api/adzuna/jobs.ts` to `server/api/market-data/jobs.ts`
     - Rename `server/api/adzuna/salary.ts` to `server/api/market-data/salary.ts`
     - Rename `server/api/adzuna/tests/*` to `server/api/market-data/tests/*`

3. **Update Usage Across the Application:**
   - Search the `app/components/` and `app/pages/` directories for `useAdzuna()` and update them to use `useJobs()`.
   - Update Playwright E2E tests (`e2e/api-fallback.spec.ts`, etc.) to mock the new `**/api/market-data/jobs**` endpoint instead of `**/api/adzuna/jobs**`.

## 3. Comments and Clarity
At the top of `server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts`, we will add JSDoc comments explicitly defining the fallback behavior:
```typescript
/**
 * Market Data Endpoint (Jobs / Salary)
 * 
 * This endpoint acts as an API gateway. It attempts to fetch data from the 
 * primary provider (Adzuna). If the primary provider returns a 429 Rate Limit error, 
 * this endpoint catches the error and seamlessly falls back to a secondary provider (Reed), 
 * mapping the response to a unified schema. 
 * The client does not need to know which provider was ultimately used.
 */
```
