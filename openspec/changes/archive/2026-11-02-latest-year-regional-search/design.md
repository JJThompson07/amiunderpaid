## Context

- `regional_salary_benchmarks` objects use the deterministic ID `${country}-${location}-${title}-${year}-${period}`, the same as their Firestore doc IDs.
- Lookups (`useMicroData`, `useMacroData`) rank `desc(year)`, filter regional queries by the national hit's year, and pin hits with `pinToSingleYear`. An older regional year in Algolia is never shown, except when the national record itself is from that older year.
- The seeder page already has `existingData`, the per-country/scope/year counts from `/api/admin/benchmark-summary` (Firestore, last 5 years).

## Decisions

1. **Prune after a successful search sync, never before.** The newest year has to be fully indexed before older years are removed, so a failed sync never leaves search with no regional data. The prune uses the existing `/api/admin/clear-algolia` endpoint with `country:<C> AND period:<P> AND year < <Y>`. `year` is a numeric attribute that is already filter-only, so Algolia's `deleteBy` handles it.
2. **The client decides whether the year is the newest, using a pure helper.** `isLatestYear(year, existingYears)` lives in `shared/utils/benchmarkYear.ts` and is unit-tested. The years come from `existingData` for the same country and the Regional scope. If the summary failed to load (empty list), the upload is treated as the newest. The prune only ever deletes strictly older years, so the worst case is an older year left in search, which pinning already handles.
3. **Regional only.** National is ~3% of the records and its older year is a real fallback. Pruning it would remove data for occupations missing from a new release.
4. **Prune failure is a warning.** The data written is correct; the only cost is quota. The admin can delete the older year by hand if needed.

## Consequence

An occupation whose national record comes from an older year, because it's missing from the newest release, now gets no regional data. Before, it got the older year's regions. This matches the existing "one data year per result" rule: with no same-year regional data, the region falls back as if no regional data exists. For UK it has no effect, because UK regional data is all-occupation (`title: All`).
