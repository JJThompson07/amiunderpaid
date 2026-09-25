# Tasks

## 1. Jobs Results Page URL Cleanup Implementation

- [x] 1.1 In `app/pages/jobs/[title]/[country]/[[location]].vue`, update the Vue imports on line 163 to import `{ onMounted, ref }` (alphabetically sorted per ESLint conventions).
- [x] 1.2 In `app/pages/jobs/[title]/[country]/[[location]].vue`, add the `onMounted` lifecycle hook after `openRecruiterModal` (around line 237) to strip transient search-form query parameters (`q`, `gov_id`, `schedule`, `contract`, `category`, `period`) using `navigateTo({ path: route.path, query: sort ? { sort: sort } : undefined }, { replace: true })` whenever `remainingQuery` contains keys, matching the pattern established in `app/pages/salary/[title]/[country]/[[location]].vue` (lines 390-398).

## 2. End-to-End Test Verification

- [x] 2.1 In `e2e/job-search.spec.ts`, update the `landing page search submission navigates to the results page` test to explicitly assert that the browser URL cleans up to `/jobs/software-engineer/uk` without trailing search query parameters (`q`, `schedule`, `contract`, `gov_id`, `category`).
- [x] 2.2 In `e2e/job-search.spec.ts`, update the `sorting by highest salary reorders listings and updates the URL` test to assert that switching sort modes produces a clean URL containing only `?sort=salary_max` (e.g. `/jobs/software-engineer/uk?sort=salary_max`).

## 3. Verification Gate

- [x] 3.1 Run full project verification suite `pnpm test:verify` (typecheck, lint, coverage, Playwright e2e, and Firestore security rules) and verify zero regressions across the codebase.
