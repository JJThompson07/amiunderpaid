## Context

We have existing logic in `server/api/adzuna/jobs.ts` and `server/api/adzuna/salary.ts` that catches 429 Too Many Requests errors from Adzuna and falls back to executing Reed API queries using `fetchReedData` and returning standardized format payloads. We need comprehensive testing to prove this works correctly. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Unit test `server/api/adzuna/jobs.ts` & `server/api/adzuna/salary.ts` focusing on the error boundary handling (429 handling).
- Validate that the data transformation step inside the fallback matches the frontend expectations.
- Build Playwright e2e tests to simulate network failure of the Adzuna API at the browser level and observe successful UI render.

**Non-Goals:**

- Changing or refactoring the fallback implementation itself (unless a critical bug is discovered during testing).
- Migrating fully away from Adzuna to Reed.

## Decisions

- **Test Mocking Strategy (Unit)**: We will use Vitest's `vi.mock` to mock `fetchReedData` and `$fetch` global respectively so that we can force `$fetch` to throw a 429 HTTP error.
- **E2E Strategy**: In Playwright, we will use `page.route` to intercept network requests specifically to the internal `/api/adzuna/jobs` endpoint or directly intercept the external `api.adzuna.com` request if executed client-side, returning 429 to trigger the fallback logic. However, since the fallback is executed _server-side_ inside `/api/adzuna/jobs`, we cannot use `page.route` to intercept `api.adzuna.com` because Playwright intercepts browser requests, not Node.js Nitro requests.
  - _Mitigation_: We will use Nitro's mock capabilities, or use the `?devProvider=reed` toggle we previously built to easily assert the Reed UI paths in E2E tests, OR we will setup MSW/Nitro request interception. The simplest approach for E2E is to leverage the newly introduced `?devProvider=reed` to force the UI into Reed fallback mode during testing.

## Risks / Trade-offs

- **Risk**: Intercepting server-side requests in Playwright is notoriously tricky.
- **Mitigation**: We will rely on unit tests to strictly verify the 429 detection and execution of the fallback in Node.js. For Playwright, we can just use the `devProviderOverride` state or `?devProvider=reed` query string (which simulates a 429 inside the route handler) to verify the E2E UI rendering of Reed data instead of relying on a real 429 from Adzuna.
