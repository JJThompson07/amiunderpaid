# live-job-search Specification

## Purpose

Enables users to search, browse, and filter live market job openings without requiring a salary input, displaying segregated Exact Matches and Similar Roles with multi-criteria salary sorting and SEO-optimised structured metadata.

## Requirements

### Requirement: Dedicated Job Search Routes and Landing Experience

The system SHALL provide a dedicated job search landing route at `/jobs` and parameterized dynamic routes at `/jobs/[title]/[country]` and `/jobs/[title]/[country]/[location]` that display live market job openings for the specified role and location. Landing page copy and value propositions MUST strictly reference only the market data providers relevant to the active country/region. Upon mounting in the client, the jobs results page SHALL clean up the browser URL to present a clean, canonical path by stripping transient search-form query parameters while preserving any active sort parameter.

#### Scenario: User visits /jobs landing page

- **WHEN** a user navigates to `/jobs`
- **THEN** the system SHALL render the job search form with title, location, schedule, contract type, and industry selector, with the salary input omitted.

#### Scenario: User executes a job search

- **WHEN** a user enters a job title (e.g., "Software Engineer") and optional region on `/jobs` and submits the search
- **THEN** the system SHALL navigate to `/jobs/software-engineer/[country]/[location]` and fetch live market roles
- **AND** once mounted on the client, the page SHALL replace the URL to strip transient search form query parameters (`q`, `gov_id`, `schedule`, `contract`, `category`, `period`) to leave a clean path.

#### Scenario: User visits or sorts with an active sort parameter

- **WHEN** a user visits a jobs results page with a `sort` query parameter or changes the sort mode
- **THEN** the system SHALL retain the `sort` query parameter in the URL while ensuring all transient search-form parameters are stripped.

#### Scenario: Regional copy on UK job search landing page

- **WHEN** a user visits `/jobs` in the UK (`en-GB`) locale
- **THEN** the landing subheading and value-prop copy SHALL reference only Reed and Adzuna
- **AND** MUST NOT reference Jooble.

#### Scenario: Regional copy on US job search landing page

- **WHEN** a user visits `/jobs` in the US (`en-US`) locale
- **THEN** the landing subheading and value-prop copy SHALL reference only Adzuna and Jooble
- **AND** MUST NOT reference Reed.

### Requirement: Search Form Job Mode

The shared search form (`BaseSearchForm.vue`) SHALL support a `'jobs'` mode that omits the salary input and salary converter controls, displays an actionable "Find Jobs" submit button, and navigates to the `/jobs/...` route structure.

#### Scenario: BaseSearchForm rendered in jobs mode

- **WHEN** `BaseSearchForm` is mounted with `mode="jobs"`
- **THEN** the salary number input field and salary converter modal trigger SHALL NOT be rendered
- **AND** the submit button SHALL display localized copy for searching jobs (e.g. "Find Jobs")
- **AND** submitting the form SHALL navigate to `/jobs/:titleSlug/:countrySlug/:locationSlug`.

### Requirement: Dual-Tier Job Listing Presentation

The job search results page SHALL partition live job results into two distinct, vertically sequenced sections:

1. **Exact Matches**: Roles matching Tier 1 criteria (exact title match).
2. **Similar Roles**: Related roles matching Tier 2 criteria (anchor phrase / broader keywords), excluding any listing already present in Exact Matches.

#### Scenario: Both exact and similar roles are returned

- **WHEN** the market data API returns both `results` (Tier 1) and `similarResults` (Tier 2)
- **THEN** the page SHALL render an "Exact Matches" section containing the Tier 1 listings
- **AND** render a separate "Similar Roles" section below containing the Tier 2 listings.

#### Scenario: Only similar roles are returned

- **WHEN** Tier 1 exact matches return zero listings but Tier 2 similar roles return listings
- **THEN** the page SHALL display the "Similar Roles" section with a clear notice that exact matches were unavailable.

#### Scenario: No jobs found

- **WHEN** both Tier 1 and Tier 2 return zero listings
- **THEN** the page SHALL display a user-friendly no-data state with suggestions to broaden the search parameters.

### Requirement: Multi-Criteria Salary and Relevance Sorting

The job search page SHALL provide sorting controls that allow users to reorder job listings by:

- **Most Relevant** (Default order based on search relevance).
- **Highest Salary** (Descending order based on `salary_max || salary_min`).
- **Lowest Salary** (Ascending order based on `salary_min || salary_max`).

The selected sort order SHALL apply to both the Exact Matches list and Similar Roles list simultaneously, while maintaining the separation between the two sections.

#### Scenario: User sorts by Highest Salary

- **WHEN** the user selects the "Highest Salary" sort option
- **THEN** listings in the "Exact Matches" section SHALL be reordered with the highest maximum salary first
- **AND** listings in the "Similar Roles" section SHALL independently be reordered with the highest maximum salary first
- **AND** the "Exact Matches" section SHALL remain positioned above the "Similar Roles" section.

### Requirement: Structured Metadata and SEO Optimization

The job search results page SHALL emit comprehensive SEO metadata (`useSeoMeta`) including localized title, description, Open Graph tags, canonical URL, and JSON-LD structured data (`BreadcrumbList` and `ItemList` containing `JobPosting` schema) to maximize search engine discoverability. Meta descriptions MUST strictly reference only the market data providers relevant to the targeted region.

#### Scenario: SEO metadata generation for job search page

- **WHEN** a search page `/jobs/[title]/[country]/[[location]]` is rendered
- **THEN** the page SHALL render structured JSON-LD breadcrumbs and job listing schemas
- **AND** set robots to `index, follow` when job listings exist, and `noindex` when zero listings exist.

#### Scenario: Localized SEO description for UK job search pages

- **WHEN** SEO metadata is generated for UK (`gb`) job search pages (`/jobs` or `/jobs/[title]/gb`)
- **THEN** meta and OG description tags SHALL mention Reed and Adzuna
- **AND** MUST NOT mention Jooble.

#### Scenario: Localized SEO description for US job search pages

- **WHEN** SEO metadata is generated for US (`us`) job search pages (`/jobs` or `/jobs/[title]/us`)
- **THEN** meta and OG description tags SHALL mention Adzuna and Jooble
- **AND** MUST NOT mention Reed.
