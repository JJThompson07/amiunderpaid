## 1. Locale / Data Updates

- [x] 1.1 Update `i18n/locales/en-GB/landing.json` to change the `trending_searches.roles` array into an array of objects `[{"title": "Software Engineer", "salary": 55000}, ...]`.
- [x] 1.2 Update `i18n/locales/en-US/landing.json` to change the `trending_searches.roles` array into an array of objects with US salaries (e.g. `[{"title": "Software Engineer", "salary": 110000}, ...]`).

## 2. Component Implementation

- [x] 2.1 Update `tailwind.config.js` (if necessary) to add `animate-marquee` and the `@keyframes marquee` rule.
- [x] 2.2 Update `app/components/Section/AmI/TrendingSearches.vue` to change the `v-for` to expect `{ title, salary }` instead of just a string.
- [x] 2.3 Modify `SectionAmITrendingSearches.vue`'s wrapper elements to create the overflow-hidden infinite scroll container and apply `animate-marquee` and `hover:[animation-play-state:paused]`. Format the salary dynamically based on region (e.g. `£55,000` or `$110,000`) using `Intl.NumberFormat` with `currentCountry`.

## 3. Verification

- [x] 3.1 Run local verification `pnpm nuxi typecheck` to ensure no TypeScript errors were introduced.
- [x] 3.2 Run local verification `pnpm vitest run` to ensure all tests pass.
