## Why

amiunderpaid is now the only consumer site, and its job in the new model is twofold:

- Earn search traffic.
- Pass the visitors who are employers, recruiters and developers on to BenchmarkMyRole.

UK result pages today answer "is this salary fair?" and stop there. The data from the earlier changes lets them answer the questions people search next:

- **"What's that after tax?"** Take-home pay, from `takeHomePay` (`api-keys-metering-billing`).
- **"Can I afford to live there on it?"** Rent from `uk_rents`, CPIH (`uk-geo-economics-ingestion`) and house prices (new here).

Both make the pages more useful and more distinctive for search. Nothing on amiunderpaid tells a business visitor the data is available as an API.

There's a compliance gap too. The site is about to show more ONS and Land Registry data, and the Open Government Licence requires attribution. `app/pages/data-sources.vue` currently describes only the job-board providers.

Constraint, checked in production on 2026-11-12: `/salary/**` is Vercel ISR, and the cached HTML for `…/london?compare=41000` and `?compare=99000` contains neither salary (`x-vercel-cache: HIT`). ISR renders ignore the query string. Anything that depends on the user's salary must therefore render after hydration from the client-side route, as the MCA score already does. Area-level context must depend only on the path.

## What Changes

- **UK House Price Index ingestion.** A third source in the monthly economics sync (`server/utils/economicsSync.ts`) does the following:
  - Streams HM Land Registry's monthly `UK-HPI-full-file-YYYY-MM.csv` (about 35 MB, about 2 months' lag; the newest available file is found by stepping back from the current month).
  - Keeps the latest row per `AreaCode` and writes `uk_house_prices/{gss}`.
  - Uses the same validation and keep-last-good rules as CPIH and rents.
- **`getGeoEconomics` gains `housePrice`**, with the same LAD → CTYUA → region fallback as rent.
- **The engine adds an `economics` block** for UK requests with a location:
  - CPIH, rent, house price
  - rent-to-take-home ratio and house-price-to-earnings ratio, computed at the **area's median pay for the role**, which keeps them path-only and cache-safe
- **New "Living costs" section** on UK `/salary/<title>/uk/<location>` pages:
  1. **Take-home pay** at the user's salary (post-hydration, from `?compare`), with tax region from the location (Scotland → Scottish bands) and a student-loan selector.
  2. **Rent burden:** area average rent as a share of take-home at the role's median, plus at the user's salary once hydrated.
  3. **House price to earnings:** area average price ÷ the role's median pay.
  4. **Inflation:** CPIH 12-month change against the year-on-year change in the role's pay.

  Each card cites its source and month. USA pages and UK pages without a location don't render the section.

- **Cross-brand calls to action to `https://www.benchmarkmyrole.com`:**
  - an amiunderpaid nav link and a footer link, "For employers & developers"
  - a "Use this data in your product" panel on `/data-sources`, `/mca-score` and `/explorer`

  As decided, **not** on `/salary` or `/jobs` results.

- **`/data-sources` rewrite:** describes every source the site now uses (ONS ASHE Tables 7.7a/14.7a/15, CPIH, Price Index of Private Rents, HM Land Registry UKHPI, plus the live job-board providers), with OGL v3.0 attribution text and links.

## Scope

UKHPI ingestion, the economics block in the engine, the Living costs section, the CTAs, and the data-sources rewrite. All UK-only apart from the nav/footer CTA.

## Non-goals

- New page families (e.g. `/cost-of-living/<place>`). Deferred until the enriched pages show search impact.
- Structured data (`Dataset`/`FAQ` JSON-LD), and USA cost-of-living data.
- CTAs on result pages (explicitly decided against).
- A/B testing of CTA copy.

## Capabilities

### New Capabilities

- `living-costs-context`: the Living costs section, its cache-safety rule, and the UK/location scoping.
- `cross-brand-cta`: where links to BenchmarkMyRole appear, and where they must not.

### Modified Capabilities

- `uk-geo-economics` (from `uk-geo-economics-ingestion`): adds house prices to the monthly sync and the read model.
- `benchmark-engine` (from `server-side-mca-engine`): adds the UK `economics` block.

## Impact

- **New:**
  - `app/components/Section/LivingCosts/{Section,TakeHome,RentBurden,HousePrice,Inflation}.vue`
  - `app/composables/useLivingCosts.ts` (+ test)
  - `app/components/AmI/BenchmarkMyRoleCta.vue`
  - i18n `living-costs.json` (both locales)
- **Modified:**
  - `server/utils/economicsSync.ts`, `server/utils/economics.ts`, `server/utils/engine/computeBenchmark.ts`, `server/api/engine/benchmark.get.ts` (+ tests)
  - `app/pages/salary/[title]/[country]/[[location]].vue`
  - `app/components/AmI/NavBar.vue`, `app/layouts/default.vue` (footer)
  - `app/pages/{data-sources,mca-score,explorer}.vue`
  - i18n `data-sources.json`, `navbar.json`, `common.json`
  - `firestore.rules` (`uk_house_prices` server-only)
- **No new runtime dependencies.** The CSV is parsed with a small streaming line splitter.
