## 1. Database & Sync Endpoint
- [ ] 1.1 In `server/api/admin/`, create a new endpoint `sync-trends.ts`. Ensure it is protected by the standard admin checks.
- [ ] 1.2 In `sync-trends.ts`, derive the list of active categories by querying distinct `categoryTag` values from the `adzuna_jobs_cache` collection (each cached search document already stores its `categoryTag` — see `server/api/market-data/jobs.ts`). Do NOT read `adzuna_category`: that collection is a sparse, manually-populated cache-duration override table (`{ cache: <days> }`) that nothing in the codebase writes to, so it cannot be treated as a registry of tracked categories.
- [ ] 1.3 For each category and country (UK/USA), query the Adzuna History API (`/v1/api/jobs/${country}/history`) with `category` and `months` query params (`months=1` for ongoing monthly syncs, `months=12` for the initial backfill) — confirmed live against the real Adzuna API: `months=12` returns exactly 12 monthly data points. Run these calls with bounded concurrency (e.g. a small batch/`Promise.all` chunk size, not one giant unbounded `Promise.all` and not a fully sequential loop) — with N categories × 2 countries this is a real number of sequential network round-trips, and Vercel serverless functions have an execution time limit, so a naive fully-sequential loop risks timing out the whole sync before it completes.
- [ ] 1.4 Format the returned Adzuna history data into a clean time-series array (e.g., `[{ month: '2023-01', average: 54000 }, ...]`), **sorted chronologically by month**. Adzuna's response does not guarantee key order — confirmed live: a real `months=12` call returned its 12 month keys in randomized order, not chronological — so this step must explicitly sort, not just trust the response shape.
- [ ] 1.5 Write the formatted data into a new Firestore collection called `adzuna_industry_trends`, using a composite document ID like `${country}_${categoryTag}` **and** an explicit `country` field (e.g. `'gb'`/`'us'`) stored on the document itself — the composite ID alone cannot be efficiently queried by country (Firestore document IDs aren't prefix-queryable without a range-query workaround), so task 2.2's "all docs for a country" read needs a real indexed field, not string-parsing of the ID. Use `set(..., { merge: true })` or array unions so that monthly updates smoothly append new data points to the existing document without overwriting history.
- [ ] 1.6 Wrap each category/country sync call so one failure (e.g. Adzuna 429s or errors on category 6 of 15) does not abort the whole batch — catch per-call errors, continue the remaining categories, and return/log a summary of which categories succeeded vs. failed so a partial sync is visible rather than silently incomplete.

## 2. Public API
- [ ] 2.1 Create a new public endpoint `server/api/market-data/industry-trends.ts` (no `.get.ts` suffix — matches this folder's existing convention: `jobs.ts` and `salary.ts` are bare filenames for GET endpoints; the `.get.ts`/`.post.ts` suffix pattern is only used in `server/api/admin/`).
- [ ] 2.2 Read the requested country from the query params (e.g., `country=gb`), normalize/validate it the same way `market-data/jobs.ts` does (map `usa`/`us` → `us`, everything else → `gb` — don't pass the raw query value straight into a Firestore `where`), then query `adzuna_industry_trends` with `.where('country', '==', countryCode)` using the field added in task 1.5.
- [ ] 2.3 Structure the response so the frontend easily receives a list of categories mapped to their historical data points.
- [ ] 2.4 Wrap the Firestore read in `defineCachedFunction` (same pattern as `fetchFromProviders` in `market-data/jobs.ts`), keyed by country, with a cache duration appropriate for data that only changes once a month (e.g. `maxAge: 60 * 60 * 24`) — this is a public, unauthenticated endpoint and every other market-data endpoint in this repo caches its Firestore/external reads; this one shouldn't be the exception.

## 3. Frontend UI (Industry Trends Page)
- [ ] 3.1 Create `app/pages/insights/industry-trends.vue`.
- [ ] 3.2 Add page metadata (`definePageMeta` or `useHead`) to ensure strong SEO titles/descriptions (e.g., "Industry Salary Trends").
- [ ] 3.3 On mount, fetch the data from `/api/market-data/industry-trends`.
- [ ] 3.4 Import and initialize `echarts`. Create a large, responsive chart container (e.g., `h-[500px] w-full`) rendered inside a premium white bento card with soft shadows.
- [ ] 3.5 Map the fetched data to ECharts `series` format (one line per industry). **CRITICAL AESTHETIC REQUIREMENTS:** The chart must not look like a generic ECharts instance. You MUST configure the `echarts.setOption` object to match the site's premium design:
  - Set `smooth: true` on all series lines for flowing bezier curves.
  - Set `animationDuration: 1500` and `animationEasing: 'cubicOut'` for slow, buttery load animations.
  - Hide all harsh axis ticks/lines (`axisLine: { show: false }`, `splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } }`).
  - Configure the tooltip to look like a Tailwind card (white background, soft shadow, rounded corners, sans-serif font).
  - Use a modern, soft color palette for the series lines.
- [ ] 3.6 Build the control panel below the chart:
  - Render a grid or flex-wrap list of interactive pill toggles, one for each industry.
  - Implement a `selectedIndustries` reactive array. Clicking a pill toggles its presence in the array.
  - Add "Select All" and "Clear All" utility buttons.
  - Watch the `selectedIndustries` array to dynamically update the `echarts` instance, filtering the visible series lines.
- [ ] 3.7 Add a time-range selector (e.g., "Last 6 Months", "Last 12 Months", "All Time") that filters the X-axis data points dynamically.
- [ ] 3.8 No hardcoded strings (`CODE_STANDARDS.md` §6): create `i18n/locales/en-GB/insights.json` and `i18n/locales/en-US/insights.json` (mirroring the existing per-page pattern used by `mca.json`) holding the page title/description, "Select All"/"Clear All" button labels, and time-range option labels. Use `$t('insights....')` in the template instead of literal text for every string introduced in 3.1–3.7.

## 4. Navigation & Sitemap
- [ ] 4.1 In the main site navbar (`app/components/AmI/NavBar.vue`), add an "Insights" navigation item. Create a dropdown or group that links to `/insights/industry-trends`. Add the "Insights" label to `navbar.json` (en-GB and en-US) and reference it via `$t()`, matching how the rest of `NavBar.vue`'s existing items are localized.
- [ ] 4.2 In `server/routes/sitemap.xml.ts`, explicitly add `'/insights/industry-trends'` to the `staticRoutes` array to ensure Google indexes it.

## 5. Verification
- [ ] 5.1 Run `pnpm typecheck` to ensure no typing regressions.
- [ ] 5.2 Hit the admin endpoint via a REST client to backfill 12 months of data, verifying Firestore populates correctly, and verify partial-failure handling from 1.6 by testing a case where one category's Adzuna call fails (e.g. an invalid category tag) — confirm the rest of the batch still completes.
- [ ] 5.3 Verify the chart renders smoothly with all lines, and toggles operate without lag.
- [ ] 5.4 Write unit tests for the new server-side logic (`CODE_STANDARDS.md` §8 — required for all new `server/**` utilities, and this repo enforces 80% coverage per file): at minimum, the category-derivation logic (1.2), the month-formatting/sorting function (1.4), and the country-normalization logic (2.2). Place them in `tests/` adjacent to the files being tested, per the existing convention. Run `pnpm test:coverage` and confirm the new/modified files clear the 80% threshold before considering this change complete.
