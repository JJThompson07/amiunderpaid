# job-provider-ui Specification

## Purpose

Dynamically adjusts frontend UI elements, including job listings and section titles, based on the data provider (Adzuna or Reed) that served the request.

## Requirements

### Requirement: Dynamic Job Section Titles

The frontend SHALL determine the data provider from the API response and display the appropriate title for the job listings section. In local development environments, a toggle control MUST be provided to manually switch the data provider.

#### Scenario: Displaying Adzuna title

- **WHEN** the jobs data indicates it was sourced from Adzuna
- **THEN** the section title SHALL be "Jobs by adzuna" and link to Adzuna.

#### Scenario: Displaying Reed title

- **WHEN** the jobs data indicates it was sourced from Reed
- **THEN** the section title SHALL be "Jobs By Reed" and link to Reed.co.uk.

#### Scenario: Displaying Developer Toggle

- **WHEN** the application is running in development mode (`import.meta.dev` is true)
- **THEN** the search results UI SHALL display a toggle button allowing the developer to switch the provider override between 'Auto', 'Adzuna', and 'Reed'.
- **AND** selecting an option SHALL trigger a re-fetch of the data using the newly selected provider mode.

### Requirement: Reed Job Listing Rendering

The frontend SHALL render a specific component for Reed job listings that displays the top 10 highest-salary jobs from the search results.

#### Scenario: Rendering Reed jobs

- **WHEN** the provider is Reed and job listings are available
- **THEN** the system SHALL display up to 10 jobs with the highest salaries, formatted correctly and linking directly to the Reed job URL.

### Requirement: View more roles link beneath the job listings carousel

The job listings section on the salary and benchmark results pages SHALL display a "View more roles" link positioned beneath the job listings carousel, right-aligned, whenever the carousel has at least one listing. The link SHALL navigate to the `/jobs` search results route for the same title, country, and (when present) location as the results page currently being viewed.

#### Scenario: Results page has job listings

- **WHEN** a user views the salary or benchmark results page for a title/country (optionally with a location) and the job listings carousel renders at least one listing
- **THEN** a "View more roles" link is shown beneath the carousel, right-aligned, that navigates to `/jobs/[title]/[country]` or `/jobs/[title]/[country]/[location]` for that same title, country, and location

#### Scenario: Results page has no job listings

- **WHEN** a user views the salary or benchmark results page and the job listings carousel has no listings to display
- **THEN** the "View more roles" link is not rendered

### Requirement: Data Sources Page Update

The "Data sources" page SHALL be updated to combine Adzuna and Reed into a single unified intelligence tile, while retaining existing tiles like "Crowdsourced".

#### Scenario: Updating data source tiles

- **WHEN** a user visits the "Data sources" page
- **THEN** the system SHALL display a combined "Adzuna & Reed Intelligence" tile.
- **AND** the description SHALL state that real-time market shifts and active job listings are sourced from both Adzuna and Reed.co.uk.
