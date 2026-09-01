## 1. New reusable slider component

- [x] 1.1 Create `app/components/AmI/Input/RangeSlider.vue`: two overlaid native `<input type="range">` elements (props `modelValue: [number, number]`, `labels: string[]`; emits `update:modelValue`), with a scoped `<style>` block for `::-webkit-slider-thumb`/`::-moz-range-thumb` pointer-events overrides (see design.md's "New `AmI/Input/RangeSlider.vue`" decision) and an absolutely-positioned filled-track `<div>` between the two handles.
- [x] 1.2 Clamp `fromIndex`/`toIndex` on every input event so the handles can never cross (`fromIndex = min(fromIndex, toIndex)` and vice versa).
- [x] 1.3 Render each thumb's current label (from `labels[index]`) above/near the handle, and set `aria-label` on each `<input>` from new i18n keys (task 3.1) so the two thumbs are distinguishable to screen readers.
- [x] 1.4 Write `app/components/AmI/Input/tests/RangeSlider.spec.ts` using `@vue/test-utils` (already a dependency, currently unused for components — see design.md's "Standards gap" decision): cover index clamping (dragging `from` past `to` and vice versa), the emitted `update:modelValue` payload shape, and label-to-index rendering. 8/8 tests pass, 100% coverage on this file scoped manually (`--coverage.include`) — **note**: `vitest.config.ts`'s default `coverage.include` glob does not include `app/components/**` at all, so the repo's 80%-per-file gate does not mechanically apply to this file today; see task 5.1.

## 2. Wire the slider into the trends chart

- [x] 2.1 In `app/components/Section/Shared/IndustryTrendsChart.vue`, replace the `timeRange` ref and the `<select>` block (current lines ~52-64, 91) with `<AmIInputRangeSlider>` bound to a new `[fromIndex, toIndex]` ref.
- [x] 2.2 Add a `fullMonths` computed: sorted union of `history[].month` across ALL `industries.value` (not `visibleIndustries` — see design.md's "Index-pair state" decision, this is what keeps the slider's bounds stable as industries are toggled). Also added a parallel `monthLabels` computed (`Intl.DateTimeFormat` "Aug 2025" style, locale-aware via `useI18n().locale`) since the design's approved slider mock shows formatted labels, not raw `"YYYY-MM"` keys — `rangeIndices` indexes into both arrays identically since they're the same length/order.
- [x] 2.3 Replace the `monthsBack`/`allMonths` computeds (current lines ~154-195) with `allMonths = fullMonths.slice(fromIndex, toIndex + 1)`; confirm `renderChart()` (current line ~261) needs no changes since it already consumes `allMonths.value` as a generic ordered `string[]`.
- [x] 2.4 Add a `hasInitializedRange`-guarded watcher (mirroring the existing `hasInitializedSelection` pattern for `selectedIndustries`) that seeds `[fromIndex, toIndex]` to `[max(0, fullMonths.length - 12), fullMonths.length - 1]` the first time `fullMonths` becomes non-empty — reproduces today's "last 12 months" default, degrading to the full span when fewer than 12 months exist.
- [x] 2.5 Update the `watch([visibleIndustries, timeRange], renderChart)` call (current line 343) to watch the new range refs instead of `timeRange`.

## 3. i18n

- [x] 3.1 In `i18n/locales/en-GB/insights.json` and `i18n/locales/en-US/insights.json`: remove the now-unused `insights.controls.timeRange.last6`/`.last12`/`.allTime` keys (verified used nowhere else in the repo), keep `insights.controls.timeRange.label` as-is, and add `insights.controls.timeRange.from` / `insights.controls.timeRange.to` for the two slider thumbs' `aria-label`s (consumed by task 1.3).

## 4. New test coverage for the page

- [x] 4.1 **Course-corrected during implementation** (see design.md's updated Risks/Trade-offs): the originally-planned `e2e/industry-trends.spec.ts` would have relied on `page.route()` mocking `**/api/market-data/industry-trends**`, but that endpoint is fetched server-side during SSR via `useAdminFirestore()` with no `process.env.E2E` fixture path (verified — unlike `jobs.ts`/`salary.ts`, which do have one) — a browser-level mock can't intercept it, so the test would've silently hit live Firestore data on `page.goto()`, violating CODE_STANDARDS.md §10. Added `app/components/Section/Shared/tests/IndustryTrendsChart.spec.ts` instead (`@vue/test-utils`, `useIndustryTrends()` mocked with a fixed fixture): covers `fullMonths`/`monthLabels` derivation, the default-range seed (last 12 months / full span), `rangeIndices` slicing into `allMonths`, and that the slider stays bounded to ALL industries' months even when only some are selected/visible.
- [x] 4.2 Update `app/composables/tests/useIndustryTrends.spec.ts` only if task 2's changes require it (they should not — the composable's public contract is unchanged); confirm by running the existing suite and only touching this file if it fails. Confirmed: 4/4 pass unmodified.

## 5. Standards

- [x] 5.1 Add a bullet to CODE_STANDARDS.md §8 codifying that reusable `AmI/**` base components with non-trivial logic (not simple presentational wrappers) get unit tests under an adjacent `tests/` dir, same convention as composables/server utils — this change is the first one to actually add such a test (task 1.4), so the written standard should catch up rather than leaving an unwritten one-off precedent. Also updated `openspec/config.yaml`'s context block (line 24), which restated the old, now-incomplete version of this rule, per CLAUDE.md's maintainer note that it must mirror CODE_STANDARDS.md.

## 6. Verification

- [x] 6.1 Run `pnpm test:verify` (lint, unit coverage, e2e, Firestore rules) and confirm it passes clean before proposing this change as done. All green: lint 0 errors/warnings, 758 unit tests pass (98%+ coverage, no threshold violations), 20/20 e2e (including SSR) pass, 13/13 Firestore rules tests pass. (`test:rules` initially failed in this session's shell due to a stale Java 8 on `PATH` — same pre-existing shell-only quirk hit earlier in this session, not a real regression; resolved by refreshing the shell and re-running with Java 21 on `PATH`, per `CLAUDE.md`'s memory of this exact issue.)
