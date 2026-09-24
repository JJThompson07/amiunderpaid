## MODIFIED Requirements

### Requirement: Dedicated Job Search Routes and Landing Experience

The system SHALL provide a dedicated job search landing route at `/jobs` and parameterized dynamic routes at `/jobs/[title]/[country]` and `/jobs/[title]/[country]/[location]` that display live market job openings for the specified role and location. Landing page copy and value propositions MUST strictly reference only the market data providers relevant to the active country/region.

#### Scenario: User visits /jobs landing page

- **WHEN** a user navigates to `/jobs`
- **THEN** the system SHALL render the job search form with title, location, schedule, contract type, and industry selector, with the salary input omitted.

#### Scenario: User executes a job search

- **WHEN** a user enters a job title (e.g., "Software Engineer") and optional region on `/jobs` and submits the search
- **THEN** the system SHALL navigate to `/jobs/software-engineer/[country]/[location]` and fetch live market roles.

#### Scenario: Regional copy on UK job search landing page

- **WHEN** a user visits `/jobs` in the UK (`en-GB`) locale
- **THEN** the landing subheading and value-prop copy SHALL reference only Reed and Adzuna
- **AND** MUST NOT reference Jooble.

#### Scenario: Regional copy on US job search landing page

- **WHEN** a user visits `/jobs` in the US (`en-US`) locale
- **THEN** the landing subheading and value-prop copy SHALL reference only Adzuna and Jooble
- **AND** MUST NOT reference Reed.

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
