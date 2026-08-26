## Overview

This change upgrades the Industry Trends feature into a Hub-and-Spoke Programmatic SEO architecture, designed to blanket Google search results for industry-specific salary trend queries.

## Key Decisions

**1. Routing Architecture Redesign**

- _Decision_: We will migrate the macro page from `app/pages/insights/industry-trends.vue` to `app/pages/insights/industry-trends/index.vue`, and introduce the dynamic route `app/pages/insights/industry-trends/[industry].vue`.
- _Rationale_: Nuxt file-based routing easily handles dynamic parameters. The `index.vue` serves as the Hub (linking to all industries), while `[industry].vue` serves as the highly-targeted Spoke.

**2. Dynamic Metadata Injection**

- _Decision_: Use `useHead()` or Nuxt's `useSeoMeta()` in the `[industry].vue` page.
- _Rationale_: We must dynamically inject the industry label into the `<title>` and `<meta name="description">`.
  - _Example Title_: "Is the market improving in {Industry}? — Salary Trends" (em-dash, not `|` -- see correction below)
  - _Example H1_: "How well do {Industry} roles pay compared to the market?"

**Correction (found during implementation):** the title format originally used a literal `|` separator. vue-i18n parses `|` inside a message string as its pluralization-rule separator, silently truncating everything after it -- the rendered title was just "Is the market improving in {Industry}?" with the suffix dropped. Changed to "—" (em-dash), matching the separator convention already used throughout `i18n/locales/*/meta.json`.

**5. Spoke Page Industry Selection (added after review, user feedback)**

- _Decision_: The Hub page (`index.vue`) keeps the original multi-select/pill UI below the chart, letting users compare several industries at once. The Spoke page (`[industry].vue`) instead gets a single plain `<select>` in the top-right of the page header, listing every tracked industry; changing it navigates to that industry's own Spoke URL (`navigateTo`) rather than adding a second line to the current chart.
- _Rationale_: The original task list (3.3) implied the Spoke page would also support toggling additional industries on for comparison via the same multi-select control used on the Hub. User feedback during implementation was that this looked and behaved poorly on a page whose whole purpose is a single, hyper-targeted industry view -- a single select matches that intent better, with room to reintroduce comparison later if wanted.
- _Implementation note_: since Vue Router reuses the same `[industry].vue` component instance across two URLs matching the same dynamic route record (no remount), `categoryTag`, `matchedIndustry`, and `industryLabel` all had to become reactive (`computed`, driven by `route.params.industry`) rather than one-time consts computed during setup -- otherwise the page would go stale after the first switch via the new select.

**3. Homepage CTA Placement**

- _Decision_: Add a clean, bento-style CTA block in `app/pages/index.vue`.
- _Rationale_: Driving internal traffic from the high-authority homepage to the Hub page passes critical SEO link equity to the trends cluster, boosting the ranking of all programmatic sub-pages.

**4. Sitemap Hydration**

- _Decision_: The `server/routes/sitemap.xml.ts` will execute a Firestore query to `adzuna_industry_trends` (not `adzuna_category`, see correction below) to fetch all active category tags.
- _Rationale_: Hardcoding the routes defeats the purpose of pSEO. By dynamically querying the DB during sitemap generation, any new category with real trend data instantly gets its own indexed landing page.

**Correction (found during implementation, see tasks.md 4.3):** the original proposal named `adzuna_category` as the source of active category tags. That collection only stores a `cache` (days) override per category tag and is unrelated to "active" status -- `server/utils/adzunaHistory.ts` has an explicit code comment confirming nothing marks a category active there. The real source of truth is `adzuna_industry_trends`, the country-scoped (`country: 'gb'|'us'`) collection already queried by `server/api/market-data/industry-trends.ts` to power the existing chart, written by the monthly `runIndustryTrendsSync` job from real search activity. The sitemap query scopes by `country` the same way the existing `jobs` query in that file does (`'us'`/`'gb'` for the two amiunderpaid domains, unscoped/deduped across both for the benchmarkmyrole domain).
