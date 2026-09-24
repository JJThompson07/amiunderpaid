## Why

The job search landing page and metadata currently list Jooble alongside Reed and Adzuna in the UK (`en-GB`) locale copy, even though Jooble is strictly a US-only market data fallback provider. In the UK, the platform searches Reed (primary) and Adzuna (fallback), while in the USA, it searches Adzuna (primary) and Jooble (fallback). Copy and SEO metadata on the `/jobs` pages must strictly reflect the providers relevant to each region so users and search engines receive accurate information.

## What Changes

- Update UK (`en-GB`) localization strings in `i18n/locales/en-GB/card.json`, `i18n/locales/en-GB/sections.json`, and `i18n/locales/en-GB/meta.json` to reference only the UK market data providers (**Reed** and **Adzuna**), removing any mention of Jooble.
- Verify US (`en-US`) localization strings in `i18n/locales/en-US/card.json`, `i18n/locales/en-US/sections.json`, and `i18n/locales/en-US/meta.json` correctly reference only US market data providers (**Adzuna** and **Jooble**), which is already accurate.
- Add test coverage in `e2e/job-search.spec.ts` to assert that the jobs landing page and meta copy render region-appropriate provider attributions for both UK and US locales.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `live-job-search`: Update the landing experience value proposition copy and SEO metadata descriptions to mandate region-isolated market data provider references (Reed & Adzuna for UK; Adzuna & Jooble for USA).

## Impact

- **Affected Files**:
  - `i18n/locales/en-GB/card.json` (`card.value-prop.live-listings.body`)
  - `i18n/locales/en-GB/sections.json` (`sections.jobs.landing.subheading`)
  - `i18n/locales/en-GB/meta.json` (`meta.jobs_index.description`, `meta.jobs.description`)
  - `e2e/job-search.spec.ts` (new assertions on localized provider copy)
- **APIs & Dependencies**: No API changes or new dependencies. Zero breaking changes.
