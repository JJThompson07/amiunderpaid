## ADDED Requirements

### Requirement: Jooble API Category Filtering via Keyword Enhancement

The Jooble fallback utility (`server/utils/jooble.ts` and `server/utils/fallback.ts`) SHALL accept an optional category parameter and incorporate the category context into the `keywords` field sent in the JSON POST body to Jooble when Adzuna fallback is triggered.

#### Scenario: Executing Jooble fallback with category
- **WHEN** Adzuna fails for a USA request that specified an industry category
- **THEN** the system SHALL forward the category to `fetchJoobleData` and append the category term to `keywords` to refine results within that industry.
