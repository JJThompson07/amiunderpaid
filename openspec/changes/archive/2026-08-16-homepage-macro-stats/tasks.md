## 1. Locale Updates

- [x] 1.1 Update `i18n/locales/en-GB/landing.json` to include a new `trending.macro_stats` block with the UK national averages (mean, bottom 10%, top 10%).
- [x] 1.2 Update `i18n/locales/en-US/landing.json` to include a new `trending.macro_stats` block with the US national averages.

## 2. Component Implementation

- [x] 2.1 Modify `app/components/Section/AmI/TrendingSearches.vue` to read `landing.trending.macro_stats`.
- [x] 2.2 Add the UI markup directly beneath the marquee wrapper to display the stats elegantly (e.g., small muted text with brand-colored values), using `formatSalary()` for the numbers.

## 3. Verification

- [x] 3.1 Run local verification `pnpm nuxi typecheck`.
- [x] 3.2 Run local verification `pnpm vitest run` to ensure all tests pass.
