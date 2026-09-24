# Proposal

## Why

The salary and benchmark results pages only ever show the top 10 job listings (the server's default `resultsPerPage` limit in `server/api/market-data/jobs.ts`), but the live `/jobs` search page can show the full, sortable, tiered result set for the same title/country/location. Users who want to see more than the 10 listings in the carousel currently have no way to get there — they'd have to re-run the search manually from `/jobs`.

## What Changes

- Add a "View more roles" link/button beneath the Job Listings carousel on both `app/pages/salary/[title]/[country]/[[location]].vue` and `app/pages/benchmark/[title]/[country]/[[location]].vue`, right-aligned.
- The link navigates to `/jobs/[title]/[country]/[location]` (location segment omitted when absent) using the same route params the results page was rendered with, mirroring the existing reverse link on the `/jobs` results page (`sections.jobs.view-salary-benchmark`).
- The link only renders when `jobListings.length > 0` (same guard as the carousel section itself).
- Add a new i18n key under `sections.jobs` (parallel to the existing `view-salary-benchmark`) in both `i18n/locales/en-GB/sections.json` and `i18n/locales/en-US/sections.json`.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `job-provider-ui`: the job listings section rendered on the salary/benchmark results pages gains a "View more roles" link beneath the carousel that deep-links to the full `/jobs` search results for the same query, addressing the 10-result cap.

## Impact

- `app/pages/salary/[title]/[country]/[[location]].vue`
- `app/pages/benchmark/[title]/[country]/[[location]].vue`
- `i18n/locales/en-GB/sections.json`, `i18n/locales/en-US/sections.json`
- No server, API, or data-provider changes. No new runtime dependencies.
