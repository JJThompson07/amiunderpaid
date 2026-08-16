## Why

When job seekers in the USA search for positions, the primary provider (Adzuna) is currently queried. If Adzuna returns zero results or experiences downtime, the system fails to display any market data for the user. Integrating Jooble as a fallback provider for the USA region ensures a resilient and comprehensive job data experience for USA users, matching the robust geographic routing architecture recently implemented for the UK.

## What Changes

- Add a new server-side integration for the Jooble API (`/server/utils/providers/jooble.ts`).
- Update the job routing logic in `/server/api/market-data/jobs.ts` (and possibly `salary.ts`) to utilize Jooble as the secondary fallback for USA traffic when Adzuna fails or returns no results.
- Map the Jooble API JSON response payload strictly to the internal `MarketJob` interface.
- Securely fetch the `JOOBLE_API_KEY` exclusively from Nuxt's private `runtimeConfig`.
- Ensure tests verify that USA traffic correctly falls back to Jooble.

## Capabilities

### New Capabilities
- `jooble-api-fallback`: Jooble API integration and USA-specific geographic fallback routing.

### Modified Capabilities
- `reed-api-fallback`: Update the geographic routing logic to explicitly accommodate the USA secondary fallback path (since the core routing logic exists here from the previous branch).

## Impact

- **Affected Code**: `server/api/market-data/jobs.ts`, `server/api/market-data/salary.ts` (if applicable), and Nuxt config `runtimeConfig`.
- **Dependencies**: No new runtime dependencies. `fetch` will be used to call the Jooble REST API.
- **Systems**: The server API Gateway will dynamically route external requests to `jooble.org/api` for USA traffic.
