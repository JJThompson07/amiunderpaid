## Why

The Industry Trends chart's time-range control is a 3-option dropdown (Last 6 / Last 12 / All Time). Since the monthly cron sync bug was fixed (`server-coverage`/`fix-cron-months-parameter` work), the stored history is growing by one real month at a time and now spans August 2025 through August 2026 (~13 months) — visitors can no longer express "show me 2025-08 to 2026-08" or any other specific window, only the three fixed presets. A dual-handle range slider lets a user pick any custom from/to month within the actual available data span instead of being limited to fixed presets.

## What Changes

- Replace the `<select>` time-range dropdown in `app/components/Section/Shared/IndustryTrendsChart.vue` with a dual-handle range slider spanning the full available month range (derived from all tracked industries' history, not just the currently-visible ones).
- Add a new reusable base component `app/components/AmI/Input/RangeSlider.vue` (two-thumb range slider over an ordered list of string labels), following this repo's `AmI`-prefix convention for generic UI controls.
- Default the initial range to the last 12 months (or the full span if fewer than 12 months of data exist yet) — preserves today's default view rather than defaulting to "all time" and changing what returning visitors see on load.
- Replace the now-unused `insights.controls.timeRange.{last6,last12,allTime}` i18n keys (in both `en-GB` and `en-US` locales) with new keys for the slider thumbs' accessible names (`from`/`to`).
- **BREAKING** (UI only, no data/API contract change): the discrete 3-preset control is removed. Existing bookmarked/shared state is not affected since the time range was never part of the URL.

## Capabilities

### New Capabilities

- None. `AmI/Input/RangeSlider.vue` is a reusable UI primitive, not a product capability — it doesn't get its own `specs/<name>/spec.md` any more than `AmI/Input/Select.vue` does.

### Modified Capabilities

- `industry-trends`: the existing "Graph Controls" requirement's scenario "User toggles industries" references "time range selectors" generically — this stays accurate (the slider is still a time-range selector), but a new scenario is added describing custom-range selection specifically, since the old scenario only implied discrete presets.

## Impact

- **Affected code**: `app/components/Section/Shared/IndustryTrendsChart.vue` (dropdown removed, `timeRange`/`monthsBack`/`allMonths` logic reworked to index-pair state over the full month span); new `app/components/AmI/Input/RangeSlider.vue`.
- **i18n**: `i18n/locales/en-GB/insights.json`, `i18n/locales/en-US/insights.json`.
- **Tests**: new unit tests for `AmI/Input/RangeSlider.vue` (no existing `app/components/**/tests/` precedent despite `@vue/test-utils` already being a dependency — see design.md for the standards gap this surfaces). New `e2e/industry-trends.spec.ts` (no e2e coverage exists today for this page at all — pre-existing gap, not introduced by this change, but the new interactive slider is a reasonable place to add first coverage).
- **No backend/API changes**: no new Firestore reads, no new external API calls, no server route changes. Purely a client-side UI/state change over data the page already fetches via `useIndustryTrends()`.
- **Country-agnostic**: this UI has no country-specific behavior (same slider for GB and US tenants); no multi-tenant boundary is touched.
