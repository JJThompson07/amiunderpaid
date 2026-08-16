## 1. Locale / Data Updates

- [x] 1.1 Update `i18n/locales/en-GB/landing.json` to include `"trending_searches"` array (e.g. "Software Engineer", "Marketing Manager", "Data Analyst", "Project Manager", "Accountant") and a heading translation.
- [x] 1.2 Update `i18n/locales/en-US/landing.json` to include a corresponding `"trending_searches"` array and heading translation.
- [x] 1.3 Update `i18n/locales/en-GB/meta.json` and `en-US/meta.json` (if needed) for any additional SEO metadata, or verify the existing strings are sufficient.

## 2. Component Implementation

- [x] 2.1 Create `app/components/Section/AmI/TrendingSearches.vue` that renders a grid of `<NuxtLink>` tags. The links should dynamically construct paths to `/salary/[role]/[country]` using `useRegion()` to determine `currentCountry`.

## 3. Page / Hero Integration

- [x] 3.1 Update `app/components/Section/AmI/Hero.vue` (adjusted to use visible h2 subheading instead of sr-only h2) to improve semantic headings without breaking layout.
- [x] 3.2 Update `app/components/Brand/AmI/Home.vue` to import and render `<SectionAmITrendingSearches />` near the bottom of the page (e.g., above or below the `Why` section).

## 4. Verification

- [x] 4.1 Run local verification `pnpm nuxi typecheck` to ensure no TypeScript errors were introduced.
- [x] 4.2 Run local verification `pnpm vitest run` to ensure all tests pass.
