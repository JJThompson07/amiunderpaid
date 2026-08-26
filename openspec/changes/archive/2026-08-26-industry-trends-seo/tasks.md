## 1. Homepage CTA

- [x] 1.1 Open `app/pages/index.vue`.
  - **Correction (found during implementation):** `app/pages/index.vue` only delegates to `app/components/Brand/AmI/Home.vue` or `app/components/Brand/Benchmark/Home.vue` based on `$siteBrand` -- editing `index.vue` itself would have no visible effect. The CTA was added to both brand home components so it appears on both tenants.
- [x] 1.2 Add a new section (a premium bento card or full-width banner) containing a preamble text: "Wondering how your industry stacks up against the rest of the market? Track average salaries over time and see if your sector is booming or busting."
  - Implemented as `app/components/Section/Shared/IndustryTrendsCta.vue`, with the copy split into an i18n-keyed heading + body (`landing.industryTrendsCta.*` in both `i18n/locales/en-GB/landing.json` and `en-US/landing.json`), matching the existing `Section/Shared/Why.vue` bento-card treatment.
- [x] 1.3 Add a primary CTA button labeled "View Industry Trends" that routes to `/insights/industry-trends`.
  - Uses the existing `<NuxtLink><AmIButton>...</AmIButton></NuxtLink>` convention (see `Section/NoData.vue`).

## 2. Hub-and-Spoke Routing

- [x] 2.1 If `app/pages/insights/industry-trends.vue` exists from the previous task, move it to `app/pages/insights/industry-trends/index.vue` to act as the Hub.
- [x] 2.2 In `index.vue`, below the main ECharts graph, fetch all active categories and render a stylish grid of NuxtLinks (e.g., `<NuxtLink to="/insights/industry-trends/it-jobs">IT Industry Trends</NuxtLink>`). This is critical for distributing link equity.
  - The page's original chart/fetch/controls logic was extracted into `app/components/Section/Shared/IndustryTrendsChart.vue` (backed by a new `useIndustryTrends()` composable, see `app/composables/useIndustryTrends.ts` + its test) so both the Hub and each Spoke page can render the chart without duplicating ~300 lines of logic. `index.vue` reads the same composable to render the link grid below the chart.
- [x] 2.3 Create the programmatic Spoke template at `app/pages/insights/industry-trends/[industry].vue`.
- [x] 2.4 In `[industry].vue`, read the route param `route.params.industry`. Use this to determine the active industry tag.

## 3. SEO Metadata Injection

- [x] 3.1 In `[industry].vue`, use `useSeoMeta()` to dynamically inject the industry label into the `<title>`, `<meta name="description">`, and `og:title`.
  - _Title format_: "Is the market improving in {Industry}? | Salary Trends"
  - `[industry].vue` awaits its own `useAsyncData` call (sharing a cache key with `useIndustryTrends()`, exported as `industryTrendsCacheKey()`) so the resolved label is available for `useSeoMeta()` during SSR -- the chart component's own fetch, being non-blocking, would otherwise leave crawlers seeing a client-hydration-only title. An unknown/mismatched-country tag now throws a real `404` (`createError({ statusCode: 404, fatal: true })`) instead of rendering a soft-404.
- [x] 3.2 Add a dynamic `<h1>` at the top of the page: "How well do {Industry} roles pay compared to the market?".
- [x] 3.3 Render the ECharts graph on this page. Initialize the `selectedIndustries` array so that ONLY the current industry is toggled ON by default, allowing the user to immediately see their specific trendline in isolation. (They can still toggle others on for comparison).
  - Implemented via the shared chart component's `initialIndustryTag` prop.
  - **Revised after review (user feedback):** on the Spoke page specifically, the multi-select/pill comparison UI is replaced by a single plain `<select>` in the top-right of the page (see 3.4 below) -- "toggle others on for comparison" from the original task text no longer applies there. The Hub page is unaffected and keeps the original multi-select comparison UI unchanged.
- [x] 3.4 (Added after review, not in the original task list) Add a single-industry `<select>` to the top-right of the Spoke page header, listing every tracked industry, that switches to a different Spoke URL on change (`navigateTo`) rather than adding a second line to the current chart. `[industry].vue`'s `categoryTag`/`matchedIndustry`/`industryLabel`/`useSeoMeta` were all made reactive to `route.params.industry` (previously one-time consts) since Vue Router reuses the same component instance across two URLs that match the same dynamic route record -- a one-time computation would have gone stale after the first switch.

## 4. Dynamic Sitemap Integration

- [x] 4.1 Open `server/routes/sitemap.xml.ts`.
- [x] 4.2 Initialize the Firestore Admin SDK (or use existing db reference) inside the route handler.
- [x] 4.3 ~~Query the `adzuna_category` collection to retrieve all active category tags.~~
  - **Correction (found during implementation):** `adzuna_category` only stores a per-category cache-duration override and has no notion of "active" -- see the explicit comment in `server/utils/adzunaHistory.ts` ("adzuna_category is NOT a valid source for this -- nothing in the codebase writes to it"). The real source of active, country-scoped category tags is `adzuna_industry_trends` (same collection `server/api/market-data/industry-trends.ts` already queries to power the chart). See `design.md` for the full correction.
- [x] 4.4 Loop through the categories and dynamically push `'/insights/industry-trends/' + category.tag` into the `urls` string alongside the static routes, ensuring Google indexes the pSEO pages.
  - Scoped by country the same way the existing `jobs` query in this file is: `'us'`/`'gb'` for the two amiunderpaid.com/.co.uk domains, unscoped (deduped across both) for the benchmarkmyrole domain. Covered by `server/routes/tests/sitemap.xml.spec.ts`.

## 5. Verification

- [x] 5.1 Run `pnpm typecheck` to ensure no routing or typing regressions.
  - (Corrected from `pnpm test:typecheck`, which is not a script in this repo -- see `package.json`.)
- [x] 5.2 Navigate to `/insights/industry-trends/it-jobs` and inspect the `<head>` in the browser to verify the dynamic `<title>` and `<meta>` tags are populated correctly.
  - Verified in a running dev server: title/og:title read "Is the market improving in IT Jobs? — Salary Trends", description reads "Track how average IT Jobs salaries have moved over the last year, powered by live market data.", and only "IT Jobs" is toggled on in the chart by default. Also verified the 404 path for an unknown tag, and hub-to-spoke navigation.
  - Found and fixed a real bug in the process: the original title string used a literal `|` separator ("... | Salary Trends"), which vue-i18n parses as its pluralization-rule separator, silently truncating everything after it. Changed to "—" (the em-dash separator already used throughout `meta.json`).
  - Unrelated, pre-existing issue noticed and left out of scope: this dev environment shows an i18n SSR/hydration mismatch (raw translation keys briefly rendered server-side, e.g. `landing.heading`) on every page including ones this change never touched (e.g. `/about`) -- not caused by or specific to this change.
- [x] 5.3 Navigate to `/sitemap.xml` in the browser and verify the dynamic industry URLs are correctly formatted and present in the XML output.
  - Verified: all 34 active category tags appear as `/insights/industry-trends/{tag}` entries alongside the existing static/dynamic routes.
