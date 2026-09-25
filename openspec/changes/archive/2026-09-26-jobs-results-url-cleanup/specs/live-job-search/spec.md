# Spec Delta

## MODIFIED Requirements

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
