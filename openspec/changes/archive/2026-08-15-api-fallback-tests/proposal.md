## Why

The Reed API fallback logic was implemented recently, but comprehensive automated testing was not fully developed. We need to ensure that our application robustly handles Adzuna rate-limits (429 Too Many Requests) and gracefully falls back to the Reed API without breaking the UI or data consistency.

## What Changes

- Add comprehensive Unit Tests for the Adzuna API handler (`server/api/adzuna/jobs.ts` and `server/api/adzuna/salary.ts`) to mock the Adzuna 429 response and verify Reed fallback execution.
- Add Unit Tests to verify that when Reed API is used as the fallback, the transformed output maps correctly to the expected frontend schema.
- Add Playwright e2e tests that intercept the Adzuna API network requests, mock a 429 response, and verify that the UI still renders correctly using Reed data.

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact

- Adds unit tests for the server routes.
- Adds e2e tests inside the Playwright tests directory (`tests/e2e/`).
- No production code logic will be fundamentally altered. This is a testing coverage feature.
