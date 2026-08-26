## Why

To establish the platform as an authoritative data source and provide deeper value to users exploring market rates, we need to provide macro-level insights into industry performance over time. A dedicated "Industry Trends" page will visually map how average salaries across different sectors (e.g., IT, Admin, Consulting) have fluctuated, using Adzuna's historical data API.

## What Changes

**1. Navbar Navigation**

- We will add an "Insights" dropdown or group to the main site navigation.
- The first item in this group will be a link to "Industry Trends" (`/insights/industry-trends`).

**2. Industry Trends Page (`app/pages/insights/industry-trends.vue`)**

- A new page where a large, interactive time-series graph is the absolute centerpiece.
- The graph will initially load displaying lines for _all_ industries, giving a macro view of the market.
- Below or beside the graph, there will be robust controls: users can toggle specific industries on and off, use "Select All" and "Clear All" buttons, and adjust the visible time range.

**3. Data Storage & Monthly Sync Strategy**

- We will create a new Firestore collection (e.g., `adzuna_industry_trends`) to permanently store the monthly average salaries per industry per country.
- We will build an admin/cron endpoint (`server/api/admin/sync-trends.ts`) that calls Adzuna's `/history` API for `months=12` to backfill the database initially.
- Going forward, this sync endpoint only needs to be triggered on the 1st of each month to fetch the latest month's data, meaning we only make 1 API call per month, per industry, per country, keeping our Adzuna API usage incredibly low and perfectly optimized.

## Capabilities

### New Capabilities

- `industry-trends-ui`: Defines the interactive charting layout and navigation structure for the new Insights page.
- `historical-data-aggregation`: Defines the server-side logic for pulling, mapping, and caching Adzuna's `/history` data for active categories.

### Modified Capabilities

## Impact

- `app/components/AmI/NavBar.vue`
- `app/pages/insights/industry-trends.vue` (New)
- `server/api/market-data/industry-trends.ts` (New)
- `server/api/admin/sync-trends.ts` (New)
- `i18n/locales/en-GB/insights.json`, `i18n/locales/en-US/insights.json` (New)
- `i18n/locales/en-GB/navbar.json`, `i18n/locales/en-US/navbar.json`

## Post-Archive Follow-Up

This change was archived once the original scope above shipped and passed review. Three real gaps surfaced afterward, from live production use and direct user feedback, and were implemented as follow-up commits on the same already-merged feature rather than a new change proposal (the work is a direct hardening/fix of what's described above, not new scope):

**1. Adzuna rate limiting.** The original "1 API call per category per country per month" framing undersold the real risk: an unpaced full sync across 50 categories hit Adzuna's documented 25 req/min limit and failed 9/50 calls with real HTTP 429s. Fixed by extracting the sync logic into `server/utils/industryTrendsSync.ts`, pacing calls in batches of 20/minute with a retry-with-backoff on 429. Verified live: the same 50-category sync that failed 9/50 unpaced completed 50/50 paced.

**2. Monthly cron scheduling.** The proposal assumed the sync would "just" run monthly but never specified how it would actually be triggered — there was no cron infrastructure in the repo at all. Added `server/api/cron/sync-trends.get.ts` + `vercel.json`, authenticated via `CRON_SECRET` (Vercel's own reserved-name convention for auto-sent cron auth), confirmed against Vercel's docs before implementing (cron always sends GET, not POST; Hobby's 300s default function duration needs no extra config).

**3. Chart/legend color system.** The original design used an ad-hoc 6-8 color palette that ran out and repeated once real data exceeded ~8 industries, and colors weren't stable across toggling (a series' color depended on its index within the currently-visible subset, so deselecting one industry reshuffled every other line's color). Replaced with:

- A 30-color categorical palette (`app/assets/css/main.css`, plain `:root` custom properties — not Tailwind `@theme` tokens, which get tree-shaken unless an actual utility class references them), reordered with a fixed stride so adjacent legend entries land far apart in hue instead of sweeping smoothly through the color wheel.
- `generateColorScale()` (`shared/utils/color.ts`, unit-tested), which expands a single seed hex into a full Tailwind-style 50-900 tonal scale, so each industry's legend pill can use the same light-tint-background/dark-text badge treatment already used everywhere else in this app (e.g. the MCA bracket badges) instead of a flat single-tone pill.
- Colors keyed by each industry's index in the _full_ list (not the visible subset), so a line's color — and its pill's color — stay stable regardless of what else is toggled on/off.
- Tooltip `confine: true` + a max-height/scroll, since an axis tooltip listing 20-30 series can grow taller than the viewport.

Impact additions: `server/utils/industryTrendsSync.ts` (New), `server/api/cron/sync-trends.get.ts` (New), `vercel.json` (New), `shared/utils/color.ts` (New), `CODE_STANDARDS.md` (documents the `generateColorScale()` pattern for future dynamic-color needs).
