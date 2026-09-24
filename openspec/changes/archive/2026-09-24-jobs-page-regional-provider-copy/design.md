## Context

See `proposal.md` for motivation.

The application uses regional market data providers:

- **UK (`gb`)**: Primary is **Reed**, fallback is **Adzuna**.
- **USA (`us`)**: Primary is **Adzuna**, fallback is **Jooble**.

In `i18n/locales/en-GB/`, three translation files (`card.json`, `sections.json`, and `meta.json`) currently mention "Jooble" alongside Reed and Adzuna in job search copy and SEO metadata descriptions. The US locale (`i18n/locales/en-US/`) already correctly mentions "Adzuna and Jooble".

## Goals / Non-Goals

**Goals:**

- Update `en-GB` translation keys (`card.value-prop.live-listings.body`, `sections.jobs.landing.subheading`, `meta.jobs_index.description`, `meta.jobs.description`) to reference only **Reed** and **Adzuna**.
- Verify `en-US` translation keys consistently reference only **Adzuna** and **Jooble**.
- Add test coverage in `e2e/job-search.spec.ts` asserting that `/jobs` renders region-appropriate provider copy on both the UK and US tenants.
- Add test coverage in `e2e/job-search.spec.ts` asserting that rendered meta tags (`meta[name="description"]` and `meta[property="og:description"]`) reflect region-isolated provider copy.

**Non-Goals:**

- Changing backend provider routing or fallback behavior in `server/api/market-data/jobs.ts` or `server/utils/fallback.ts` (already properly configured).
- Modifying UI components or introducing template conditionals (the templates already delegate to localized `$t()` strings).

## Decisions

### Decision 1: Direct update to locale files rather than template conditionals

The jobs landing and results pages (`app/pages/jobs/index.vue` and `app/pages/jobs/[title]/[country]/[[location]].vue`) rely on `$t()` to resolve strings per locale (`en-GB` vs `en-US`). Updating the locale JSON files maintains separation of concerns and follows the established i18n architecture without cluttering Vue templates with runtime country checks.

_Alternatives considered:_

- Hardcoding dynamic string interpolation in Vue templates using `isUSSite ? ... : ...`. Rejected because it breaks translation encapsulation and violates `CODE_STANDARDS.md` §6.

### Decision 2: E2E assertions for regional landing copy and meta description tags

To test both UK and US localization contexts accurately in Playwright:

1. **Multi-Tenant Navigation**: In accordance with the pattern established in `e2e/ssr.spec.ts`, navigate using explicit domain origins (`http://ami-uk.localhost:3000/jobs` or relative `/jobs` for UK `en-GB`, and `http://ami-us.localhost:3000/jobs` for US `en-US`) to trigger the tenant middleware.
2. **Landing Page Value Props**: Assert that the rendered subheading and value proposition copy contains "Reed and Adzuna" without "Jooble" on the UK site, and "Adzuna and Jooble" without "Reed" on the US site.
3. **SEO Meta Tag Assertions**: Assert that the rendered `<meta name="description">` and `<meta property="og:description">` tag attributes contain region-specific providers using `page.locator('meta[name="description"]').getAttribute('content')` and `page.locator('meta[property="og:description"]').getAttribute('content')`.

_Alternatives considered:_

- Testing only via Vitest JSON snapshots. E2E provides higher-fidelity verification that the rendered DOM and head metadata seen by users and crawlers reflect the updated localization across tenant subdomains.

## Risks / Trade-offs

- **[Risk]** Potential broken assertions in existing test suites if any tests hardcoded the old string with "Jooble".
  - **Mitigation**: Grep confirmed no existing unit or e2e tests assert on the old triple-provider string. Adding new explicit assertions ensures future changes won't regress this copy.
