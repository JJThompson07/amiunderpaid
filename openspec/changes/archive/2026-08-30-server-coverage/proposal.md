## Why

The backend (`server/**`) currently has a relaxed starting threshold of 0% for test coverage, while the rest of the application adheres to a strict 80% requirement. As the platform matures, untested API endpoints and admin actions represent a significant risk for regressions. We must reinstate the 80% coverage limit globally to ensure full confidence in the platform's stability, security, and data integrity.

## What Changes

**1. Configuration Enforcement (`vitest.config.ts` & `AGENTS.md`)**
- We will remove the `server/**/*.ts` threshold override (currently set to 0) in `vitest.config.ts`, forcing it to inherit the global 80% limit.
- We will update the `AGENTS.md` documentation to remove the explicit 0% exemption clause, asserting that all backend endpoints must now meet the 80% bar before any future PRs can be merged.

**2. Test Implementation for Untested Endpoints**
- We will systematically scaffold and write missing unit tests (`.spec.ts`) for all untested server routes and utilities, leveraging existing mock patterns (e.g., `useAdminFirestore` mocks, `$algolia` mocks, and `h3` event mocks).
- Primary areas of focus include:
  - `server/api/admin/**` (Cache cleaning, algolia syncing, parsed metrics)
  - `server/api/user/**` (Lead submissions, recruiter access, suggestion endpoints)
  - `server/api/market-data/**` (Categories, update match)
  - `server/utils/firebase.ts`
- Because `vitest.config.ts` enforces coverage `perFile: true`, EVERY file matched by the `server/**/*.ts` include glob must independently clear 80%, not just the primary areas above. A full enumeration (see `tasks.md` §1a) additionally surfaces these currently-untested files, which are in scope too:
  - `server/utils/fallback.ts` (country-branching provider fallback — UK→Reed, US→Jooble)
  - `server/plugins/1.firebaseInit.ts`
  - `server/routes/favicon.ico.ts`, `server/routes/robots.txt.ts`
  - `server/constants/locations.ts`

**3. Coverage Verification**
- The execution phase will iteratively run `pnpm test:coverage` to track progress and ensure all 4 metrics (statements, branches, functions, lines) exceed 80% across the board.

## Capabilities

### Modified Capabilities
- `server-coverage`: Strict enforcement of CI test thresholds across all Nuxt Nitro server endpoints.

## Impact

- `vitest.config.ts`
- `AGENTS.md`
- `server/api/admin/**/*.spec.ts`
- `server/api/user/**/*.spec.ts`
- `server/api/market-data/**/*.spec.ts`
- `server/api/engine/**/*.spec.ts`
- `server/utils/tests/firebase.spec.ts`
- `server/utils/tests/fallback.spec.ts`
- `server/plugins/tests/1.firebaseInit.spec.ts`
- `server/routes/tests/favicon.ico.spec.ts`, `server/routes/tests/robots.txt.spec.ts`
- `server/constants/tests/locations.spec.ts`
