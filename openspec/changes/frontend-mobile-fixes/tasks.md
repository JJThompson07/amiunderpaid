## 1. i18n Text Updates

- [ ] 1.1 In `i18n/locales/en-GB/search.json`, update the `switch-site` key to be shorter: `"Switch to our US site"`.
- [ ] 1.2 In `i18n/locales/en-US/search.json`, update the `switch-site` key to be shorter: `"Switch to our UK site"`. Verify by running `pnpm lint:i18n`.

## 2. Mobile Layout Fixes

- [ ] 2.1 In `app/components/BaseSearchForm.vue`, locate the `div` containing the site switcher and Salary Converter button (currently `class="flex justify-between items-center px-4 py-3 mt-1"`). Add `flex-wrap gap-y-3` so the items wrap gracefully on narrow screens. 

## 3. Results Page & Explainer Card Refactoring

- [ ] 3.1 In `app/components/Section/AdzunaComparison.vue`, remove the dynamic semantic background colors from the root container (e.g., `bg-negative-100`, `bg-positive-100`). Set the root to a neutral `bg-white border border-slate-200 rounded-3xl p-6 shadow-sm`.
- [ ] 3.2 In `app/components/Section/AdzunaComparison.vue`, restructure the internal layout. Import a relevant icon from `lucide-vue-next` (e.g., `LineChart`). Create a side-by-side flex layout where the icon and title sit on the left, and the data points/verdict sit on the right. Move the semantic coloring to a small badge/pill for the verdict.
- [ ] 3.3 Repeat tasks 3.1 and 3.2 for `app/components/Section/GovernmentComparison.vue`. Set the root to neutral `bg-white`, import an icon (e.g., `Landmark` or `Building2`), and move the semantic underpaid/overpaid colors to a small indicator pill, ensuring the card fills horizontal space efficiently.
- [ ] 3.4 Create a new component `app/components/TargetIcon.vue`. It should accept a `bracket` string prop. 
  - Import `Crown`, `TrendingUp`, `Shuffle`, `TrendingDown`, and `Siren` from `lucide-vue-next`.
  - Create a `Record` mapping the bracket keys (`leader`, `strong`, `competitive`, `below`, `review`) to their SVG filename in `/mca-brackets/` AND their corresponding Lucide component, as well as their dark semantic text color (e.g., `text-positive-800`).
  - Render a relative wrapper (e.g., `w-16 h-16 flex items-center justify-center`). Render the SVG as the background (`<img class="absolute inset-0 w-full h-full object-contain" />`) and render the Lucide icon on top (`<component class="relative w-6 h-6 z-10" />`) mapped from the dictionary.
- [ ] 3.5 In `app/pages/mca-score.vue`, redesign the top section of the `<article v-for="bracket in brackets">` card to place the icon in the top right.
  - Replace the current `<div class="flex items-center justify-between mb-3">` with `<div class="flex items-start justify-between mb-5">`.
  - Inside this wrapper, create a left column (`<div class="flex flex-col items-start gap-2">`) and place the semantic badge and the range numbers inside it (so the range sits directly below the pill).
  - Place `<TargetIcon :bracket="bracket" class="shrink-0" />` as the second child of the main wrapper so it anchors to the top right.

## 4. Testing & Verification

- [ ] 4.1 Run `pnpm typecheck` and `pnpm lint` to ensure no build regressions. Run `pnpm test:e2e` to confirm no visual regressions. Use mobile emulation in DevTools to verify `BaseSearchForm.vue` wraps correctly without overlapping.
