## Why

Adding the 2026 government data pushed Algolia past the plan's 100,000-record limit (108,109 records on 2026-11-02). `regional_salary_benchmarks` was 74,000 of them. It held each country's full regional dataset twice, once for 2025 and once for 2026. Only one year is ever served: lookups pin results to a single data year, and the newest year always wins. The older copy cost quota and did nothing.

A manual stop-gap on 2026-11-02 removed USA 2025 regional records from Algolia only, taking the total to 71,578 records. This change makes that the seeder's normal behaviour, so the next yearly upload doesn't hit the limit again.

## What Changes

- After a regional dataset syncs to search, the seeder removes older years of that country and period from the `regional_salary_benchmarks` Algolia index. Firestore keeps every year.
- Uploading a regional year older than the newest one already in Firestore writes it to Firestore only and skips the search index, so an old year never replaces the latest one in search.
- If pruning fails, the seeder logs a warning but doesn't fail the sync. A leftover older year is harmless: lookups already pin to one year.
- Deleting the newest regional year warns the admin that search now has no regional data for that country until a year is synced again.
- National data (`salary_benchmarks`, ~3,200 records) is unchanged and keeps every year. The older national year is the fallback for occupations missing from the newest release (~19 UK occupations in 2026).

## Non-goals

- Restructuring Algolia records (e.g. one record per occupation with a nested `years` array). This was considered and rejected: it would change the shape of every record and every query, to save what pruning already saves.
- Changing `job_titles` (~29k records). It has no year dimension.
- Re-syncing search from Firestore when the newest year is deleted.

## Capabilities

### Modified Capabilities

- `government-data-seeder`: regional uploads keep only the newest year in search.
- `regional-benchmark-data`: search holds one regional year per country; Firestore holds all.
