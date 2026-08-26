## Why

To establish the platform as an authoritative data source and provide deeper value to users exploring market rates, we need to provide macro-level insights into industry performance over time. A dedicated "Industry Trends" page will visually map how average salaries across different sectors (e.g., IT, Admin, Consulting) have fluctuated, using Adzuna's historical data API.

## What Changes

**1. Navbar Navigation**
- We will add an "Insights" dropdown or group to the main site navigation.
- The first item in this group will be a link to "Industry Trends" (`/insights/industry-trends`).

**2. Industry Trends Page (`app/pages/insights/industry-trends.vue`)**
- A new page where a large, interactive time-series graph is the absolute centerpiece. 
- The graph will initially load displaying lines for *all* industries, giving a macro view of the market.
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
