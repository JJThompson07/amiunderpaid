## 1. Localisation Copy Updates

- [ ] 1.1 Update `i18n/locales/en-GB/card.json` key `card.value-prop.live-listings.body` from `"Search real, current vacancies pulled directly from Reed, Adzuna, and Jooble."` to `"Search real, current vacancies pulled directly from Reed and Adzuna."` and verify valid JSON.
- [ ] 1.2 Update `i18n/locales/en-GB/sections.json` key `sections.jobs.landing.subheading` from `"Search live UK job listings from Reed, Adzuna, and Jooble in one place."` to `"Search live UK job listings from Reed and Adzuna in one place."` and verify valid JSON.
- [ ] 1.3 Update `i18n/locales/en-GB/meta.json` keys `meta.jobs_index.description` and `meta.jobs.description` to remove references to Jooble and reference only Reed and Adzuna, and verify valid JSON.
- [ ] 1.4 Review and verify `i18n/locales/en-US/card.json`, `i18n/locales/en-US/sections.json`, and `i18n/locales/en-US/meta.json` to confirm US copy correctly references only Adzuna and Jooble without mentioning Reed.

## 2. Testing & Verification

- [ ] 2.1 Add an E2E test in `e2e/job-search.spec.ts` asserting that visiting `/jobs` on the UK site renders the localized subheading and value proposition copy referencing "Reed and Adzuna", and confirming "Jooble" is absent from the rendered text.
- [ ] 2.2 Add an E2E test in `e2e/job-search.spec.ts` navigating to `http://ami-us.localhost:3000/jobs` to trigger US tenant middleware, asserting that the rendered subheading and value proposition copy references "Adzuna and Jooble", and confirming "Reed" is absent from the rendered text.
- [ ] 2.3 Add E2E tests in `e2e/job-search.spec.ts` asserting that rendered meta tags (`meta[name="description"]` and `meta[property="og:description"]`) on the UK jobs landing page (`http://ami-uk.localhost:3000/jobs` or `/jobs`) mention "Reed and Adzuna" without "Jooble", and on the US jobs landing page (`http://ami-us.localhost:3000/jobs`) mention "Adzuna and Jooble" without "Reed", and verify via `pnpm test:e2e e2e/job-search.spec.ts`.
- [ ] 2.4 Run the full verification suite with `pnpm test:verify` to confirm linting, typechecking, 80% coverage thresholds, Firestore rules, and Playwright E2E tests all pass cleanly.
