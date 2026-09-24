# Tasks

## 1. Pre-flight verification

- [x] 1.1 Confirm no existing e2e/Playwright spec under `e2e/` asserts on the exact contents of the salary/benchmark "Job Listings" section (element counts, snapshots) that a new sibling element would break — verified: `grep -rl "sections.jobs\|AmICarousel\|view-salary-benchmark" e2e` returns no matches, so no existing e2e coverage of this section exists to break.

## 2. i18n

- [x] 2.1 Add a `sections.jobs.view-more-roles` key (interpolated with `{ displayTitle }`, mirroring the existing `sections.jobs.view-salary-benchmark` key's shape) to `i18n/locales/en-GB/sections.json` and `i18n/locales/en-US/sections.json`, and verify `pnpm lint` (spellcheck + structure-lint) passes on both files.

## 3. Salary results page

- [x] 3.1 In `app/pages/salary/[title]/[country]/[[location]].vue`, add a right-aligned `NuxtLink` beneath `</AmICarousel>` (still inside the `v-if="jobListings.length"` block) that links to `/jobs/${route.params.title}/${route.params.country}` (with `/${route.params.location}` appended when `route.params.location` is present) and renders `$t('sections.jobs.view-more-roles', { displayTitle })`, styled to match the existing reverse-link pill classes used on the `/jobs` results page. Verify by starting the dev server and viewing a `/salary/[title]/[country]` route with job listings present — the link appears beneath the carousel, right-aligned, and navigates to the matching `/jobs` route.

## 4. Benchmark results page

- [x] 4.1 Apply the same change from task 3.1 to `app/pages/benchmark/[title]/[country]/[[location]].vue` (using its own `route`/`displayTitle`/`jobListings`), and verify the same way on a `/benchmark/[title]/[country]` route.

## 5. Verification gate

- [x] 5.1 Run `pnpm test:verify` and confirm it passes (lint including spellcheck/typecheck/Prettier/structure-lint/check-standards/ESLint, unit test coverage, Playwright e2e, and Firestore rules tests).
