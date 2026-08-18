# Implementation Tasks

## 1. File Renaming

- [x] 1.1 Rename `app/composables/useAdzuna.ts` to `app/composables/useJobs.ts`. Update the export from `useAdzuna` to `useJobs` and add the explanatory JSDoc comment. Update internal `$fetch` calls to `/api/market-data/jobs` and `/api/market-data/salary`.
- [x] 1.2 Rename the `server/api/adzuna` directory to `server/api/market-data`.
- [x] 1.3 Add JSDoc comments to `server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts` explaining the API gateway fallback pattern.

## 2. Refactoring Usage

- [x] 2.1 Search and replace all instances of `useAdzuna()` with `useJobs()` across `app/components/` and `app/pages/`.
- [x] 2.2 Search and replace all imports of `server/api/adzuna` with `server/api/market-data` inside the unit tests at `server/api/market-data/tests/jobs.spec.ts` and `salary.spec.ts`.
- [x] 2.3 Update E2E test `e2e/api-fallback.spec.ts` to intercept `**/api/market-data/**` instead of `**/api/adzuna/**`.

## 3. Verification

- [x] 3.1 Run `pnpm vitest run` to ensure all unit tests pass with the new paths.
- [x] 3.2 Run `pnpm test:e2e e2e/api-fallback.spec.ts` to ensure the E2E test passes with the renamed endpoints.
- [x] 3.3 Check coverage using `pnpm test:coverage` to ensure renaming did not drop coverage below 80%.
