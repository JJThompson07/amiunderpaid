## 1. Threshold Configuration

- [x] 1.1 In `vitest.config.ts`, locate the `thresholds` object inside the `coverage` block.
- [x] 1.2 Delete the `'server/**/*.ts'` override completely (the block setting `statements: 0`, `branches: 0`, `functions: 0`, `lines: 0`), so that the server directory falls under the global `*` 80% threshold.

## 1a. Pre-Flight: Full File Enumeration

- [x] 1a.1 Run `find server -name "*.ts" -not -path "*/tests/*" -not -name "*.spec.ts"` and diff it against `find server -name "*.spec.ts"` to produce the complete, current list of untested files under `server/**`. Because `thresholds.perFile: true` is set in `vitest.config.ts`, coverage is enforced independently per file — task 4.1 will fail on ANY untested file in the `server/**/*.ts` glob, not just the ones enumerated in section 3 below. Do this before starting section 3 so no file is discovered mid-implementation.
- [x] 1a.2 As of proposal time, this enumeration additionally surfaces the following untested files that fall outside the "primary areas of focus" in `proposal.md` and must also be brought to ≥80%: `server/utils/fallback.ts` (country-branching fallback routing — UK→Reed, US→Jooble — see AGENTS.md §7), `server/plugins/1.firebaseInit.ts`, `server/routes/favicon.ico.ts`, `server/routes/robots.txt.ts`, and `server/constants/locations.ts`. Re-run the diff at implementation time in case the file list has drifted since this proposal was written.

## 2. Protocol Documentation Update

- [x] 2.1 In `AGENTS.md`, locate the **5. CI / Testing Enforcement** section.
- [x] 2.2 Delete the bullet point note that says: _"Note: Server API routes (`server/**`) currently have a relaxed starting threshold of 0%. When modifying or adding new server endpoints, you MUST write corresponding unit tests to establish coverage."_

## 3. Test Scaffolding & Implementation

- [x] 3.1 Write unit tests for all untested files in `server/api/admin/` (e.g., cache cleaning, parse algorithms, algolia syncing) to reach >80% coverage. Store tests in `server/api/admin/tests/`.
- [x] 3.2 Write unit tests for all untested files in `server/api/user/` (e.g., recruiter requests, leads) to reach >80% coverage. Store tests in `server/api/user/tests/`.
- [x] 3.3 Write unit tests for all untested files in `server/api/market-data/` (e.g., categories, update match) to reach >80% coverage. Store tests in `server/api/market-data/tests/`.
- [x] 3.4 Write unit tests for all untested files in `server/api/engine/` (e.g., match title) to reach >80% coverage. Store tests in `server/api/engine/tests/`.
- [x] 3.5 Write unit tests for `server/utils/firebase.ts` to reach >80% coverage. Store in `server/utils/tests/`.
- [x] 3.6 Write unit tests for `server/utils/fallback.ts` covering both the `countryCode === 'us'` (Jooble) and non-US (Reed) branches of `executeMarketFallback`, plus `getMockFallbackJobs`/`getMockFallbackHistogram`, to reach >80% coverage. Store in `server/utils/tests/`.
- [x] 3.7 Write unit tests for `server/plugins/1.firebaseInit.ts` to reach >80% coverage. Store in `server/plugins/tests/`.
- [x] 3.8 Write unit tests for `server/routes/favicon.ico.ts` and `server/routes/robots.txt.ts` to reach >80% coverage. Store in `server/routes/tests/`. (Also discovered and fixed `server/routes/sitemap.xml.ts`'s pre-existing spec, which was below the per-file threshold — dynamic job-route/prefix/country-scoping branches were entirely untested.)
- [x] 3.9 Write unit tests for `server/constants/locations.ts` to reach >80% coverage (if it exports only static data with no branches, confirm import-time evaluation alone satisfies the threshold; add a trivial import-assertion test if not already exercised by another spec). Store in `server/constants/tests/`.

## 4. Verification

- [x] 4.1 Run `pnpm test:coverage` and assert that the suite passes with 0 failures and that the global coverage threshold (including all server files) strictly remains $\ge$ 80%. (Also fixed a pre-existing `vitest.config.ts` bug that made threshold enforcement a silent no-op for the entire repo, and excluded the two static territory lookup-table data files from coverage — see final report.)
