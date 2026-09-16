## Purpose

Defines the search form industry dropdown filter and its query propagation to market data composables and results pages.

## ADDED Requirements

### Requirement: Optional Industry Search Filter

The search form component (`BaseSearchForm.vue`) SHALL provide an optional Industry select dropdown using `AmIInputSelect` that defaults to empty/null (representing all industries) without blocking form submission.

#### Scenario: Submitting search without selecting an industry
- **WHEN** a user fills in a job title and leaves the Industry dropdown empty
- **THEN** the form SHALL submit normally and navigate to the results route without attaching an `industry` or `category` query parameter.

#### Scenario: Submitting search with an industry selected
- **WHEN** a user selects a specific industry (e.g. "IT Jobs", tag `it-jobs`) and submits the search form
- **THEN** the form SHALL navigate to the results route including the selected industry category tag in the URL query string (e.g. `?category=it-jobs`).

### Requirement: Live Region-Aware Industry Options

The search form SHALL populate industry options dynamically using `useJobs().fetchCategories(activeCountry)` (which queries `/api/market-data/categories`), refreshing the options when the active country selection changes (such as toggling UK/USA tabs in benchmark mode).

#### Scenario: Switching region updates industry list
- **WHEN** the active search region switches from UK to USA
- **THEN** `fetchCategories('us')` SHALL be called and the industry dropdown options SHALL update with the complete USA category list from Adzuna.

### Requirement: Composable Industry Parameter Propagation

The `useJobs` and `useLocationEngine` composables SHALL accept an optional category parameter and forward it to the `/api/market-data/jobs` and `/api/market-data/salary` API endpoints.

#### Scenario: Location engine initializes with category query
- **WHEN** a user visits a salary or benchmark results page with a `category` (or `industry`) query parameter in the URL
- **THEN** `useLocationEngine` SHALL extract the category tag and pass it into `useJobs.fetchJobs` and `useJobs.fetchHistogram`.
