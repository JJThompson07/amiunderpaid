## Purpose

Dynamically adjusts frontend UI elements, including job listings and section titles, based on the data provider (Adzuna or Reed) that served the request.

## ADDED Requirements

### Requirement: Dynamic Job Section Titles
The frontend SHALL determine the data provider from the API response and display the appropriate title for the job listings section.

#### Scenario: Displaying Adzuna title
- **WHEN** the jobs data indicates it was sourced from Adzuna
- **THEN** the section title SHALL be "Jobs by adzuna" and link to Adzuna.

#### Scenario: Displaying Reed title
- **WHEN** the jobs data indicates it was sourced from Reed
- **THEN** the section title SHALL be "Jobs By Reed" and link to Reed.co.uk.

### Requirement: Reed Job Listing Rendering
The frontend SHALL render a specific component for Reed job listings that displays the top 10 highest-salary jobs from the search results.

#### Scenario: Rendering Reed jobs
- **WHEN** the provider is Reed and job listings are available
- **THEN** the system SHALL display up to 10 jobs with the highest salaries, formatted correctly and linking directly to the Reed job URL.

### Requirement: Data Sources Page Update
The "Data sources" page SHALL be updated to combine Adzuna and Reed into a single unified intelligence tile, while retaining existing tiles like "Crowdsourced".

#### Scenario: Updating data source tiles
- **WHEN** a user visits the "Data sources" page
- **THEN** the system SHALL display a combined "Adzuna & Reed Intelligence" tile.
- **AND** the description SHALL state that real-time market shifts and active job listings are sourced from both Adzuna and Reed.co.uk.
