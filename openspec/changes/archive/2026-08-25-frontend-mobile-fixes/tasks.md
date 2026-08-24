## 1. i18n Text Updates

- [x] 1.1 In `i18n/locales/en-GB/search.json`, update the `switch-site` key to be shorter: `"Switch to our US site"`.
- [x] 1.2 In `i18n/locales/en-US/search.json`, update the `switch-site` key to be shorter: `"Switch to our UK site"`. Verify by running `pnpm lint:i18n`.

## 2. Mobile Layout Fixes

- [x] 2.1 In `app/components/BaseSearchForm.vue`, locate the `div` containing the site switcher and Salary Converter button (currently `class="flex justify-between items-center px-4 py-3 mt-1"`). Add `flex-wrap gap-y-3` so the items wrap gracefully on narrow screens.

## 3. Results Page & Explainer Card Refactoring

> Note: `Section/AdzunaComparison.vue` and `Section/GovernmentComparison.vue` do not exist under those names — the real components are `app/components/Section/Adzuna/Comparison.vue` and `app/components/Section/Government/Comparison.vue`, and neither owns a root container. Both render into the shared `app/components/Card/Result.vue`, which owns the root background, border, and icon/title header for both cards. Tasks 3.1–3.3 were implemented by editing that shared component instead of duplicating identical changes into each comparison file.

- [x] 3.1 In `app/components/Card/Result.vue` (the shared root both comparison cards render into), removed the per-comparison gradient background (`bg-linear-to-b from-positive-50/...`, etc.) from `cardClasses`. Root is now neutral `bg-white border-slate-200` (or `bg-slate-100 border-slate-200` in the no-salary placeholder state), with `rounded-3xl` and `shadow-sm`.
- [x] 3.2 In `app/components/Card/Result.vue`, the icon + title already sit on the left of the header with the verdict pill (`AmIChip` via `chipData`) on the right — this already carries the semantic coloring as a small badge rather than a full background. Bumped the icon container/glyph size (`p-1.5`→`p-2`, `w-4 h-4`→`w-5 h-5`) for richer iconography. `Section/Adzuna/Comparison.vue` continues to pass `TrendingUp` as its icon.
- [x] 3.3 `Section/Government/Comparison.vue` already passes `Landmark` as its icon; the neutral background and indicator-pill verdict now apply automatically via the shared `Card/Result.vue` change in 3.1.
- [x] 3.4 Created `app/components/TargetIcon.vue`. Accepts a typed `bracket` prop (`'leader' | 'strong' | 'competitive' | 'below' | 'review'`).
  - Imports `Crown`, `TrendingUp`, `Shuffle`, `TrendingDown`, and `Siren` from `lucide-vue-next`.
  - `bracketMap` Record maps each bracket key to its SVG filename in `/mca-brackets/`, its Lucide component, and a dark semantic text color (`text-positive-800`, `text-neutral-800`, `text-warning-800`, `text-negative-800`, `text-negative-900`).
  - Renders a `w-16 h-16 flex items-center justify-center` wrapper with the SVG absolutely positioned behind (`object-contain`) and the Lucide icon layered on top (`relative z-10 w-6 h-6`).
- [x] 3.5 In `app/pages/mca-score.vue`, redesigned the top section of the `<article v-for="bracket in brackets">` card to place the icon in the top right.
  - Replaced `<div class="flex items-center justify-between mb-3">` with `<div class="flex items-start justify-between mb-5">`.
  - Added a left column (`<div class="flex flex-col items-start gap-2">`) containing the semantic badge and range numbers.
  - Added `<TargetIcon :bracket="bracket" class="shrink-0" />` as the second child of the wrapper, anchored top-right.

## 4. Testing & Verification

- [x] 4.1 Run `pnpm typecheck` and `pnpm lint` to ensure no build regressions. Run `pnpm test:e2e` to confirm no visual regressions. Use mobile emulation in DevTools to verify `BaseSearchForm.vue` wraps correctly without overlapping.
