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

## Post-Archive Decisions

Added after the change above was implemented and archived — see `proposal.md`'s "Post-Archive Follow-Up" for why.

**8. Rate-Limit Pacing**

- _Decision_: Extracted the sync into `server/utils/industryTrendsSync.ts`, shared by both the admin endpoint and the new cron route. Adzuna calls are paced in batches of 20/minute (`chunkForRateLimit`, pure and unit-tested) with a one-retry-with-10s-backoff on HTTP 429.
- _Rationale_: Decision 6 above ("bounded concurrency") turned out to be necessary but not sufficient — bounded concurrency alone still fires all chunks back-to-back with no pacing between them, and a real full-catalogue sync (50 categories) hit Adzuna's real rate limit and failed 9/50 calls with genuine 429s.
- _Verified_: Adzuna's documented limit is 25 requests/minute, 250/day, 1000/week, 2500/month. Batches of 20 leave a safety margin under the per-minute figure, which is the only one a single sync run could plausibly hit (even a larger future category count stays orders of magnitude under the daily/weekly/monthly ceilings for a once-a-month job). Live test: the identical 50-category sync that failed 9/50 unpaced completed 50/50 with this pacing in place.

**9. Cron Trigger & Auth**

- _Decision_: New `server/api/cron/sync-trends.get.ts`, outside `/api/admin/` (so `admin-guard.ts`'s blanket `verifyAdmin` check doesn't reject it), authenticated via a `CRON_SECRET` runtime-config value checked against the request's `Authorization` header. `vercel.json` schedules it for the 1st of each month.
- _Rationale_: There was no cron infrastructure anywhere in this repo before this. Confirmed against Vercel's own documentation before implementing, not assumed: Vercel Cron always invokes via GET (the existing `sync-trends.post.ts` is POST-only, hence the separate route); it automatically sends whatever value is set for an env var literally named `CRON_SECRET` as `Authorization: Bearer <value>` — that specific name is Vercel's own reserved convention, not an arbitrary choice; Hobby-plan cron schedules are restricted to at most once per day, which a monthly schedule trivially satisfies; Hobby's function duration default (300s) already covers the paced sync's worst-case runtime without extra `maxDuration` configuration.
- _User confirmed_: given the choice between a dedicated `CRON_SECRET` vs. reusing the existing `NUXT_ADMIN_ACCESS_KEY`, chose the dedicated secret for clean separation of concerns.

**10. Categorical Chart Palette & Legend Color Matching**

- _Decision_: A 30-color palette (`app/assets/css/main.css`, plain `:root` custom properties `--chart-1`..`--chart-30`) on a systematic hue rotation, fixed moderate saturation/lightness (not neon, not washed-out), then re-ordered with a fixed stride (step 13, coprime with 30) so consecutive palette entries land ~156° apart in hue instead of the ~12° they'd be at in raw rotation order.
- _Rationale_: The first version reused 6-8 existing semantic theme colors (`primary-500`, `positive-500`, etc.), which repeated once real data exceeded that many industries, and a first attempt at 30 colors declared directly inside the Tailwind `@theme` block was silently pruned down to 1 surviving color at build time.
- _Verified_: confirmed live via the browser's compiled stylesheet that Tailwind v4 tree-shakes `@theme` tokens unless an actual utility class (e.g. `bg-chart-5`) references them somewhere in scanned templates — only `--color-chart-1` survived when all 30 were declared there, since nothing in the codebase uses a `chart-N` utility class (this pattern is now documented in `CODE_STANDARDS.md` §5 for future dynamic-color work). Moving the declarations to a plain `:root` block (outside `@theme`) fixed it, confirmed by re-inspecting the compiled CSS.
- _Also fixed_: colors were previously assigned by a series' index within the _visible_ (filtered-by-toggle) subset, so deselecting one industry reshuffled every other line's color and the legend pill could never reliably match its line. Colors are now keyed by each industry's index in the _full_ list.
- _User feedback_: legend pills should use the same light-tint-background/dark-text badge treatment already used elsewhere in the app (e.g. the MCA bracket badges), not a flat single-tone pill or a neutral pill with a color swatch dot. Since only one hex per industry was available, added `generateColorScale()` (`shared/utils/color.ts`, unit-tested) to derive a full Tailwind-style 50-900 tonal scale from that single seed color — the pill uses the `100`/`800` stops, the chart line uses `500`.

**11. Tooltip Overflow**

- _Decision_: `confine: true` plus a `max-height`/`overflow-y: auto` on the tooltip's `extraCssText`.
- _Rationale_: With 20-30 series selected, ECharts' axis-trigger tooltip lists one row per series and grew taller than the viewport. `confine` keeps it positioned within the chart's own bounds; the height cap makes the overflow scrollable instead of clipped or overflowing the page.
