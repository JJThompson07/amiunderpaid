## MODIFIED Requirements

### Requirement: Dedicated Job Search Routes and Landing Experience

The system SHALL provide a job search landing route at `/jobs` and dynamic routes at `/jobs/[title]/[country]` and `/jobs/[title]/[country]/[location]` that display live job openings for the role and location. Landing copy MUST reference only the live providers for the active region (Reed for the UK; Careerjet and Jooble for the USA; never Adzuna). On client mount, the results page SHALL strip transient search-form query parameters from the URL while keeping any active sort parameter.

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
- **THEN** the landing subheading and value-prop copy SHALL reference Reed
- **AND** MUST NOT reference Adzuna, Careerjet, or Jooble.

#### Scenario: Regional copy on US job search landing page

- **WHEN** a user visits `/jobs` in the US (`en-US`) locale
- **THEN** the landing subheading and value-prop copy SHALL reference Careerjet and Jooble
- **AND** MUST NOT reference Adzuna or Reed.

### Requirement: Structured Metadata and SEO Optimization

The job search results page SHALL emit SEO metadata (`useSeoMeta`) including localized title, description, Open Graph tags, canonical URL, and JSON-LD structured data (`BreadcrumbList` and `ItemList` containing `JobPosting` schema). Meta descriptions MUST reference only the live providers for the targeted region (Reed for UK; Careerjet and Jooble for USA; never Adzuna).

#### Scenario: SEO metadata generation for job search page

- **WHEN** a search page `/jobs/[title]/[country]/[[location]]` is rendered
- **THEN** the page SHALL render structured JSON-LD breadcrumbs and job listing schemas
- **AND** set robots to `index, follow` when job listings exist, and `noindex` when zero listings exist.

#### Scenario: Localized SEO description for UK job search pages

- **WHEN** SEO metadata is generated for UK (`gb`) job search pages (`/jobs` or `/jobs/[title]/uk`)
- **THEN** meta and OG description tags SHALL mention Reed
- **AND** MUST NOT mention Adzuna, Careerjet, or Jooble.

#### Scenario: Localized SEO description for US job search pages

- **WHEN** SEO metadata is generated for US (`us`) job search pages (`/jobs` or `/jobs/[title]/usa`)
- **THEN** meta and OG description tags SHALL mention Careerjet and Jooble
- **AND** MUST NOT mention Adzuna or Reed.

## ADDED Requirements

### Requirement: Jobs Page Industry Comes From the Search Request

The jobs results page SHALL take its industry only from the industry the user selected in the search form (`?category=` resolved through `getIndustryByTag`), and SHALL NOT derive an industry from SOC codes or from the first listing's category label.

#### Scenario: User searched with an industry selected

- **WHEN** a jobs search is executed with `category=it-jobs`
- **THEN** the page's industry is `IT & Communications` and the category is passed to the live provider as a keyword filter.

#### Scenario: User searched without an industry

- **WHEN** a jobs search is executed with no `category`
- **THEN** the page's industry is `null`, regardless of what category labels the returned listings carry.
