## Context

`app/components/Section/Shared/IndustryTrendsChart.vue` currently drives its ECharts x-axis from `allMonths`, a computed that unions `history[].month` strings across `visibleIndustries` (the currently-_selected_ industries only) and slices to the last N months per a `timeRange` ref bound to a native `<select>` (`'6' | '12' | 'all'`). This scopes the available range to whatever's selected, which is fine for a 3-preset dropdown but wrong for a slider: if the slider's min/max were also scoped to `visibleIndustries`, toggling an industry on/off would shift the slider's bounds under the user's feet mid-interaction.

No composable currently computes month bounds — `useIndustryTrends()` only exposes `industries`/`loading`/`error`. No server change is needed: `industries[].history[].month` (format `"YYYY-MM"`) is already present in the existing `/api/market-data/industry-trends` response.

## Goals / Non-Goals

**Goals:**

- Let the user drag two handles to pick any custom `[from, to]` month window within the full available data span.
- Keep the slider's bounds stable regardless of which industries are currently toggled on/off.
- Preserve today's default view (last 12 months, or full span if fewer exist) so existing visitors don't see a jarring change on load.
- Ship a reusable `AmI`-prefixed component, not one-off markup inside the chart component.

**Non-Goals:**

- No server/API changes — the full history is already fetched client-side.
- No persistence of the selected range (URL query param, localStorage) — out of scope; matches today's behavior where `timeRange` is also not persisted.
- No calendar/date-picker UI — the range is over discrete month steps, not arbitrary dates.

## Decisions

**Index-pair state over the full month list, not date math.** `fullMonths` becomes a computed sorted union of `history[].month` across ALL `industries.value` (not `visibleIndustries`), giving stable bounds. The slider operates on `[fromIndex, toIndex]` into `fullMonths`, and the existing `allMonths` computed (feeding `renderChart()`) becomes `fullMonths.slice(fromIndex, toIndex + 1)` intersected with whatever's actually present per visible industry (unchanged from today — `renderChart()` already does `byMonth.get(month) ?? null` with `connectNulls: true`, so a month with no data point for a given industry is already handled). This is a pure rename/rescope of existing reactive plumbing, not new derivation logic.

**New `AmI/Input/RangeSlider.vue`, not a third-party slider library.** Repo has zero existing slider dependency (verified: no `slider`/`noUiSlider`/`rc-slider`/`vue-slider` match in `package.json`, no `type="range"` usage anywhere in `app/`). Two native, overlaid `<input type="range">` elements is a well-established, dependency-free dual-thumb pattern:

- Both inputs share `min="0" max="{{ steps.length - 1 }}"`, absolutely positioned on top of each other, each bound to one index (`fromIndex` / `toIndex`).
- `pointer-events: none` on both `<input>` elements, `pointer-events: auto` scoped to `::-webkit-slider-thumb` / `::-moz-range-thumb` — the standard trick that makes only the thumbs (not the full-width track) draggable, so clicks pass through to whichever thumb is on top at that point.
- This genuinely needs a scoped `<style>` block, since Tailwind utilities cannot target `::-webkit-slider-thumb`/`::-moz-range-thumb` pseudo-elements. CODE_STANDARDS.md §5 already carves out this exact exception ("highly specific external library overrides like ECharts or custom scrollbars") — a native-input pseudo-element override is the same category of unavoidable escape hatch, not a new precedent that weakens the utility-first rule.
- Alternative considered: a single `<input type="range">` with a custom-drawn second thumb via absolute-positioned `<div>`s and manual pointer-event math. Rejected — reimplements keyboard accessibility (arrow keys, Home/End, screen-reader `aria-valuenow`) that native range inputs give for free; the overlaid-inputs trick keeps two real, independently focusable/keyboard-operable form controls.
- Clamping: `fromIndex` is clamped to `min(fromIndex, toIndex)` on every input event and vice versa, so handles can never cross.

**Props/emits contract:** `modelValue: [number, number]`, `labels: string[]` (one formatted label per step, e.g. `"Aug 2025"`), emits `update:modelValue`. The component only knows about indices and label strings — it has no knowledge of "months" — keeping it genuinely reusable (matches how `AmI/Input/Select.vue` takes generic `AutocompleteOption[]`, not domain-specific types).

**Default range preserved via same-shape init logic.** The existing `hasInitializedSelection`-guarded watcher pattern (already used for `selectedIndustries`) is mirrored for the range: once `fullMonths` first becomes non-empty, seed `[fromIndex, toIndex]` to `[max(0, fullMonths.length - 12), fullMonths.length - 1]` — reproduces "last 12 months," degrades gracefully to the full span when fewer than 12 months exist (same edge case the old `monthsBack` slice already handled via `sorted.slice(-limit)` on a shorter array).

**Standards gap surfaced — propose addition to CODE_STANDARDS.md:** §8 mandates unit tests for `~/shared/utils/` and `~/server/utils/` and composables, but is silent on Vue components, even though `@vue/test-utils` is already an installed dependency with zero current usage (`app/components/**/tests/` doesn't exist anywhere in the repo today). `AmI/Input/RangeSlider.vue` has genuine logic worth testing (index clamping, label-to-index mapping, emitted `update:modelValue` shape) independent of any specific page that consumes it. This change adds `app/components/AmI/Input/tests/RangeSlider.spec.ts` using `@vue/test-utils` and proposes codifying "reusable `AmI/**` base components with non-trivial logic (not simple presentational wrappers) get unit tests under an adjacent `tests/` dir, same convention as composables/server utils" as a new bullet under CODE_STANDARDS.md §8, rather than silently starting a one-off pattern with no written rule behind it.

## Risks / Trade-offs

- **[Risk]** Overlaid dual `<input type="range">` is a known CSS pattern but has a common failure mode: if both thumbs land on the same value, the top-layered input's thumb can "trap" the bottom one, making it hard to drag apart. → **Mitigation**: give the `to` input a higher `z-index` than `from` by default (dragging "to" leftward past "from" is the more common gesture near the max end being adjusted down), and since clamping prevents `from > to`, the worst case is both at the same index — standard mitigation, not a novel risk needing a custom solution.
- **[Risk]** Native range inputs don't natively support a visual "filled track between the two handles" — without it, the slider reads as two independent sliders rather than one range control. → **Mitigation**: an absolutely-positioned `<div>` behind the inputs, width/left computed from `fromIndex`/`toIndex` as percentages of `steps.length - 1`, colored with the existing `--color-*` Tailwind tokens (no new colors needed).
- **[Trade-off]** No e2e coverage exists for the industry-trends page today (verified: no `e2e/*trend*` or `e2e/*insight*` file, no existing spec references `insights`). **Course-corrected during implementation**: a Playwright e2e test was originally planned here, but `server/api/market-data/industry-trends.ts` fetches straight from Firestore (`useAdminFirestore()`) during this page's SSR `useAsyncData` call, with no `process.env.E2E` fixture path (unlike `server/api/market-data/jobs.ts`/`salary.ts`, which do have one via `server/utils/fallback.ts`). A browser-level `page.route()` mock can't intercept that server-internal fetch, so an e2e test here would silently run against live, uncontrolled Firestore data on `page.goto()` — exactly what CODE_STANDARDS.md §10 says not to do, and non-deterministic besides. Adding a Firestore-emulator/fixture path for this endpoint would be a real backend change, contradicting this proposal's "No backend/API changes" impact statement — out of scope here. Instead, this change adds a component-level test (`app/components/Section/Shared/tests/IndustryTrendsChart.spec.ts`, `@vue/test-utils`, mocking `useIndustryTrends()` directly with a fixed fixture) covering the same wiring (`fullMonths`, `monthLabels`, `rangeIndices` default-seeding, `allMonths` slicing) deterministically. Closing the page's e2e gap entirely remains out of scope for this change either way.

## Migration Plan

No data migration. Deploy is a normal Vercel production deploy on merge to `main` (matches this repo's existing flow — no feature flag, no dual-write period; this is a pure client-side UI swap with no backend contract change to sequence around). Rollback is a normal revert.

## Open Questions

None — UX pattern (dual-handle slider) was already confirmed with the user before this proposal was written.
