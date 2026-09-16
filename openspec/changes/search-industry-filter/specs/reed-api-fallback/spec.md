## ADDED Requirements

### Requirement: Reed API Category Filtering via Keyword Enhancement

The Reed fallback utility (`server/utils/reed.ts` and `server/utils/fallback.ts`) SHALL accept an optional category parameter and incorporate the category context into the `keywords` query sent to the Reed.co.uk API when Adzuna fallback is triggered.

#### Scenario: Executing Reed fallback with category

- **WHEN** Adzuna fails for a UK request that specified an industry category
- **THEN** the system SHALL forward the category to `fetchReedData` and append the category term to `keywords` to refine results within that industry.
