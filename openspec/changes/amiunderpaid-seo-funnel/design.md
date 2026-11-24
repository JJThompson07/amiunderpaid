## Context

- `/salary/**` is served by Vercel ISR (`swr: 86400`). Production on 2026-11-12 shows query strings are ignored by the cached render: `?compare=` values never appear in the HTML. `useLocationEngine` reads `userSalary` from `route.query.compare` on the client, and the MCA score renders after hydration.
- After the earlier changes:
  - `/api/engine/benchmark` returns baselines with `basis`.
  - `getGeoEconomics(location)` returns CPIH and rent.
  - `calculateTakeHome` is in `shared/utils/takeHomePay.ts`.
  - The monthly `sync-economics` cron runs `syncCpih` and `syncRents` with keep-last-good semantics.
- UKHPI: `https://publicdata.landregistry.gov.uk/market-trend-data/house-price-index-data/UK-HPI-full-file-YYYY-MM.csv`.
  - On 2026-11-12 the newest file was `2026-08` (35,125,643 bytes); `2026-09` returned 404.
  - Columns start `Date,RegionName,AreaCode,AveragePrice,Index,…`. Dates are `DD/MM/YYYY`, and rows are grouped by area in ascending date order.

## Goals / Non-Goals

**Goals:**

- Area-level figures are identical for every visitor to a path, so they're safe in the ISR HTML that search engines index.
- Salary-dependent figures only appear after hydration, never baked into a cached page.

**Non-Goals:**

- Personal finance advice. Cards state figures and sources; no recommendations.

## Decisions

### D1. UKHPI streaming parse

`syncHousePrices()` in `server/utils/economicsSync.ts`:

- **Find the file:** try the current month, then step back up to 4 months and take the first 200 response.
- **Parse:** stream the body through `TextDecoderStream`, with no full-file buffering. Chunks end at arbitrary byte boundaries, so keep a carry-over buffer: prepend it to each chunk, split on newlines, and hold back the last (possibly partial) segment for the next chunk; flush it at end of stream. Strip a trailing `\r`. Locate the `Date`, `AreaCode`, `RegionName` and `AveragePrice` columns by header name (not position). Convert each `DD/MM/YYYY` date to ISO `YYYY-MM-DD` before comparing (a raw string compare is not chronological), and keep the row with the greatest ISO date per `AreaCode`, so about 450 entries are held in memory.
- **Validate:** at least 300 areas, each with a GSS-shaped code and a positive price, and a latest month no older than 6 months. Otherwise the source counts as failed (keep last good).
- **Write:** batch `uk_house_prices/{gss}` = `{ name, averagePrice, month, updatedAt }`, plus metadata in `uk_economic_indicators/house-prices`.

### D2. Engine `economics` block (path-only inputs)

For UK requests with a resolved location, `computeBenchmark` adds:

```
economics: {
  cpih: { month, annualChangePct },
  rent: { month, average, level, gss } | null,
  housePrice: { month, average, level, gss } | null,
  atRoleMedian: { annualPay, takeHomeMonthly, rentShareOfTakeHome, housePriceToEarnings },
  payChangeYoY: number | null        // role's regional (else national) median, newest vs previous ASHE year
}
```

`atRoleMedian` uses the regional pay figure when `basis !== 'national'`, otherwise the national median. Take-home uses the location-implied tax region with no student loan. Everything here depends only on (SOC, location), so it's identical for every visitor to a path.

### D3. Salary-dependent cards are client-only

`useLivingCosts(engineEconomics, userSalary, taxRegion, studentLoans)` computes:

- take-home at the user's salary
- the user's rent share
- the user's house-price-to-earnings ratio

These figures are rendered inside `<ClientOnly>`. In SSR, each salary-dependent card shows only its role-median figures; the "your salary" line appears after hydration. That matches how the MCA score already behaves, and keeps the cached HTML free of any one visitor's salary.

The student-loan selector is local state persisted in `localStorage`, wrapped in try/catch so it works without storage.

### D4. Section placement and scoping

- **Placement:** `SectionLivingCosts` renders on the salary page after the government/live market cards and before the negotiation section.
- **Scope:** `v-if="country === 'UK' && location && economics"`. USA pages and location-less UK pages render nothing, with no empty shell.
- **Attribution:** each card ends with a source line (dataset + month) linking to `/data-sources#<anchor>`.

### D5. CTA component and placement

`AmIBenchmarkMyRoleCta` has two variants:

- `inline`: a text link for nav and footer.
- `panel`: heading, two lines, a button to `https://www.benchmarkmyrole.com`.

The links are absolute, `rel="noopener"` (same tab), and get `utm_source=amiunderpaid&utm_medium=<placement>` so GA can attribute them.

Placements:

- `NavBar.vue` desktop and mobile menus (non-admin)
- the `default.vue` footer
- the `panel` variant on `/data-sources`, `/mca-score` and `/explorer`

The component accepts a `placement` prop and is never mounted on `/salary/**` or `/jobs/**`. A unit test and the cross-brand spec enforce that.

## Risks / Trade-offs

- **[Risk] A Land Registry format change silently breaks house prices.**
  → Header-name lookup plus shape validation fail closed; the monthly email reports it.
- **[Risk] Ratios at the role median are read as personal advice.**
  → Copy says "at the typical salary for this role here", and the user's own figures are labelled separately.
- **[Risk] Thin or estimated regional pay feeds the ratios.**
  → The ratios inherit `basis`. Estimated inputs show the same "estimated" note as the pay card.
- **[Trade-off] The 35 MB monthly download** runs once a month in a cron with the project's 300s function default (verified 2026-11-24; re-checked in task 1.5), streamed at about 450 entries in memory. That's acceptable.
