## Overview

This feature introduces a macro-level data visualization tool to the platform. By aggregating historical salary data by industry, we provide users with a powerful way to track the market trajectory of their profession.

## Key Decisions

**1. Charting Library**

- _Decision_: We will use the existing `echarts` dependency.
- _Rationale_: ECharts is highly performant for rendering multiple time-series lines simultaneously.
- _Aesthetic Constraints_: To ensure it matches the site's luxurious, modern bento aesthetic, the chart must be heavily styled. We will use `smooth: true` for bezier curves, disable harsh axis/grid lines, set tooltip backgrounds to match Tailwind's white rounded-xl styles with soft shadows, use the site's font family, and configure `animationDuration: 1500` with an `animationEasing: 'cubicOut'` for butter-smooth load animations.
- _Decision_: Create a new Firestore collection `adzuna_industry_trends`.
- _Rationale_: Documents should be keyed logically, e.g., `${countryCode}_${categoryTag}` (e.g., `gb_it-jobs`), **and** carry an explicit `country` field alongside it. Inside the document, we will store an array of data points: `{ month: '2023-01', average: 54000 }` or a map to allow easy appending.
- _Correction_: the composite document ID alone is not enough — Firestore document IDs cannot be efficiently queried by prefix without a range-query workaround, so the public read endpoint (which needs "all docs for a country") requires the `country` field to be a real, separately-queryable field on the document, not just encoded into the ID string.

**3. Initial Backfill vs Ongoing Sync**

- _Decision_: A unified `server/api/admin/sync-trends.ts` endpoint.
- _Rationale_: The endpoint will accept a `months` parameter (default 1 for monthly sync, but allows 12 for the initial backfill). This ensures we can populate the graph immediately without waiting a year, while strictly adhering to a low-impact 1-call-per-category strategy moving forward.
- _Verified_: `months=12` was tested live against the real Adzuna API and returns exactly 12 monthly data points, so backfilling in a single call per category/country is confirmed to work as designed.
- _Verified_: the response's `month` object keys are not chronologically ordered (confirmed live — a real 12-month response came back shuffled), so the sync must explicitly sort by month key before writing to Firestore or rendering.

**3a. Category Source**

- _Decision_: Derive the list of categories to sync from distinct `categoryTag` values already present in the `adzuna_jobs_cache` collection, not from `adzuna_category`.
- _Rationale_: `adzuna_category` is a sparse, manually-maintained cache-duration override table (`{ cache: <days> }`) — nothing in the codebase writes documents into it, so it cannot be queried as a registry of active categories. `adzuna_jobs_cache` documents, by contrast, already store a real `categoryTag` field on every cached search (see `server/api/market-data/jobs.ts`), making it the actual source of truth for which categories the platform has live data for.

**4. UI Layout**

- _Decision_: The graph is the "hero" of the page.
- _Rationale_: The page will feature a large, edge-to-edge bento card containing the ECharts canvas. Below it, a robust control panel (e.g., a grid of pill toggles) will allow users to quickly show/hide industries, grouped visually to handle the high density of categories (e.g., "Select All", "Clear All").

**5. Public Endpoint Robustness**

- _Decision_: The public read endpoint (`server/api/market-data/industry-trends.ts`) wraps its Firestore read in `defineCachedFunction`, keyed by country, with a day-scale cache duration.
- _Rationale_: Every other market-data endpoint in this repo (`jobs.ts`, `salary.ts`) caches its reads via `defineCachedFunction`; industry trends data changes at most once a month, so an uncached read on every page load would be an unjustified departure from the repo's own convention. Country query params are normalized the same way `jobs.ts` does it (allowlist to `gb`/`us`) rather than passed raw into a Firestore query.

**6. Sync Resilience**

- _Decision_: `sync-trends.ts` runs its per-category/country Adzuna calls with bounded concurrency and catches failures per-call rather than per-batch.
- _Rationale_: This is an unattended batch job hitting an external, rate-limited API across potentially many categories × 2 countries. A fully sequential loop risks exceeding Vercel's serverless function execution limit; a single unhandled error partway through would otherwise silently abort the rest of the sync. Both risks are addressed by chunked concurrency plus per-call error isolation with a success/failure summary.

**7. Internationalization**

- _Decision_: All user-facing strings (page copy, control labels, nav item) go through new `insights.json` locale files and `navbar.json`, per `CODE_STANDARDS.md` §6 — no hardcoded strings, consistent with every other page in this repo.
