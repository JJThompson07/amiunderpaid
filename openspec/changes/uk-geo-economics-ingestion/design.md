## Context

- `shared/utils/govSpreadsheet.ts` parses ONS/BLS workbooks in the browser, and `app/pages/admin/seed.vue` batch-writes the records to Firestore and syncs them to Algolia. Doc ids are `${country}-${location}-${title}-${year}-${period}`.
- `utils/locations/uk.ts` `ONS_LOCATIONS` has 396 `{ id, name, gov_name }` entries (countries, regions, counties, UAs, LAs) with no GSS codes. The only GSS codes in the system are the `id_code`s on Table 7.7a regional records.
- After `server-side-mca-engine`, `server/utils/engine/baselines.ts` reads regional micro data by `id_code == soc` and `searchLocation == location`. For the UK that matches nothing today.
- Existing crons (`server/api/cron/{clean-cache,sync-trends}.get.ts`) authenticate with `CRON_SECRET` using a timing-safe compare and email a summary through Resend.

## Goals / Non-Goals

**Goals:**

- Give every UK request a regional occupation figure where ONS publishes one, and say honestly how it was derived (`basis`).
- Resolve any UK place name from `ONS_LOCATIONS`, or any postcode outcode, to its region without a network call.
- Keep inflation and rents fresh without manual work, and degrade to the last good value.

**Non-Goals:**

- Sub-regional occupation pay. ONS doesn't publish it with usable coverage, so we don't model it.

## Decisions

### D1. Table 15 is parsed as a new seeder scope, Firestore-only

`parseGovernmentWorkbook` gains `scope: 'regional-occupation'`:

- **Sheet and columns:** uses the `Full-Time` sheet (consistent with the existing UK scopes) and the existing header detection (`Description`, `Code`, `Median`, `Mean`, `10`, `25`, `75`, `90`).
- **Rows:** splits `Description` at the first comma into region and occupation. Strips the code's leading apostrophe with the existing `parseCode`, and sets `soc_level` from the code length (4 or 3).
- **Region mapping:** maps the region name to its GSS code through a fixed 11-entry table in `ukGeo.ts`. `East` → `E12000006` "East of England". A region name not in the table fails the parse loudly, so a renamed region can't be silently dropped.
- **Suppressed values:** `x`, `..` and `:` are skipped per cell, as `parseUKVal` already does. A row is kept if it has either a median or a mean. Today's parser drops rows with no median; for this scope that would discard 2,183 4-digit rows that do have a mean.

The admin uploads both workbooks (4-digit and 3-digit) under this scope.

- **Doc ids** append the code: `uk-<region>-<title>-<code>-<year>-year`. Without it, 3-digit and 4-digit titles could collide.
- **Algolia sync is skipped** for this scope. The engine reads Firestore, and nothing in the UI searches occupation × region records.
- **"Delete dataset"** for this scope deletes by `country`, `year` and `soc_level` existence, so it never touches the Table 7.7a records.

### D2. The regional micro cascade lives in the engine

For a UK request with a resolved region:

| Step | Source                                   | Value                                                       | `basis`              |
| ---- | ---------------------------------------- | ----------------------------------------------------------- | -------------------- |
| 1    | T15 SOC4 @ region, median present        | median, p-values as published                               | `regional`           |
| 2    | T15 SOC4 @ region, mean only             | mean × (national SOC4 median / national SOC4 mean)          | `regional-estimated` |
| 3    | T15 SOC3 parent @ region, median present | SOC3 median × (national SOC4 median / national SOC3 median) | `regional-parent`    |
| 4    | none                                     | null, so the scorer uses national ÷ modifier (today's path) | `national`           |

- **Parent code:** the first 3 digits of the 4-digit code (SOC 2020 is strictly hierarchical). The national SOC3 median comes from `salary_benchmarks`, where Table 14.7a carries 1-, 2-, 3- and 4-digit rows, if that row is present. Without it, step 3 is skipped.
- **Data year:** all lookups in the cascade are pinned to one year (`pinToSingleYear`), matching "One data year per result".
- **Scorer input:** `microRegionalData` is only filled from steps 1–3. The scorers already treat a present `microRegionalData` as "use regional, don't normalise", so steps 2 and 3 slot in without changing scoring code.

### D3. Location resolution: a generated static file

`shared/data/uk-geo.json`, about 3k outcode rows plus ~400 place rows, roughly 150 KB:

```json
{ "version": "2026-11", "regions": { "E12000007": "London", … },
  "places": { "warwickshire": { "gss": "E10000031", "level": "ctyua", "rgn": "E12000005" }, … },
  "outcodes": { "CV34": { "lad": "E07000222", "rgn": "E12000005" }, … } }
```

- **Generator:** `scripts/build-uk-geo.ts` downloads ONS Geoportal lookups (LAD→CTYUA→RGN) and an OGL postcode lookup, assigns each outcode to the LAD holding most of its live postcodes, and writes the file. It runs manually when boundaries change (annually at most). The output is committed, so builds and runtime never fetch it.
- **Matching:** `ONS_LOCATIONS` entries are matched by `gov_name`/`name`. Any unmatched entry fails the script, which then lists them for a human to map in a small override table inside the script.
- **Resolver:** `resolveUkLocation(input)` normalises input (case, hyphens, a trailing "UA"). It tries an outcode pattern first (`^[A-Z]{1,2}\d[A-Z\d]?$`, or a full postcode truncated to its outcode), then places. It returns null if neither matches.
- **Server-side loading:** the JSON is imported in server code only, so it doesn't add to the client bundle. A client import would be caught by review; `ukGeo.ts` carries a header comment saying it's server-only.

Rejected: a postcodes.io (or similar) runtime lookup. It's a third-party dependency on every API call and a rate limit we don't control.

### D4. Economics sync

`server/utils/economicsSync.ts` exports one function per source:

- **`syncCpih()`** fetches the ONS `L522/MM23` JSON, parses the `months` array into `{ month: 'YYYY-MM', index }`, and writes `uk_economic_indicators/cpih` = `{ latest, series (last 25 months), updatedAt, lastError: null }`.
- **`syncRents()`** fetches the PIPR dataset page and finds the newest `.xlsx` link. It parses the area table (GSS code, area name, average rent, month) and batch-writes `uk_rents/{gss}`, plus `uk_economic_indicators/rents` metadata (`month`, `count`, `updatedAt`).

`GET /api/cron/sync-economics` runs both with `Promise.allSettled`:

- A failing source writes `lastError` (message redacted per §9.6) to its metadata doc and leaves its data untouched.
- The run emails a summary through Resend, the same way `clean-cache.get.ts` does.
- Schedule: `0 5 20 * *` (the 20th of the month, after ONS's mid-month releases).

Both parsers validate shape before writing: CPIH needs at least 12 months; rents needs at least 300 areas, each with a GSS code and a positive rent. Otherwise the source counts as failed and nothing is overwritten. That stops a changed ONS format from silently writing garbage.

### D5. `getGeoEconomics(location)`

`server/utils/economics.ts`:

- Resolves the location with `resolveUkLocation`, then reads the CPIH doc and the rent doc for the most specific GSS available (LAD → CTYUA → region).
- Returns `{ location: {…}, cpih: { month, index, annualChangePct }, rent: { month, average, gss, level } | null, sources: [...] }`.
- Results are cached in memory for 6h, the same pattern as the engine baselines.

## Risks / Trade-offs

- **[Risk] The ONS file formats change.**
  → The parsers validate shape and fail closed (the last good value stays). The cron email surfaces it. The Table 15 parser fails loudly on an unknown region name.
- **[Risk] Step 2/3 estimates are presented as if published.**
  → `basis` is returned by the engine and the API, and consumer UI labels anything other than `regional` as "estimated" (task 5.2).
- **[Risk] Outcode → LAD majority assignment misplaces border outcodes.**
  → It's accurate to region for nearly all outcodes; region is the granularity the occupation data has anyway. Rent lookups for a misassigned outcode use a neighbouring LA's rent, which is acceptable for context data.
- **[Trade-off] Northern Ireland has no regional occupation data.**
  → NI resolves to `N92000002` and the cascade goes to step 4 (`basis: 'national'`), which is today's behaviour.
