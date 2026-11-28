## MODIFIED Requirements

### Requirement: Dynamic Job Section Titles

The frontend SHALL determine the data provider from the API response (`reed`, `careerjet`, or `jooble`) and display the appropriate attribution title and link for the job listings section. In local development environments, a toggle control MUST be provided to manually switch the data provider.

#### Scenario: Displaying Adzuna title

- **WHEN** any results page renders a job listings section
- **THEN** the section title SHALL NOT be "Jobs by adzuna" and SHALL NOT link to Adzuna, because no response can carry `provider: 'adzuna'` (legacy cached documents with that provider are treated as cache misses).

#### Scenario: Displaying Reed title

- **WHEN** the jobs data indicates it was sourced from Reed
- **THEN** the section title SHALL be "Jobs By Reed" and link to `https://www.reed.co.uk`.

#### Scenario: Displaying Careerjet title

- **WHEN** the jobs data indicates it was sourced from Careerjet
- **THEN** the section title SHALL be "Jobs By Careerjet" and link to `https://www.careerjet.com`.

#### Scenario: Displaying Jooble title

- **WHEN** the jobs data indicates it was sourced from Jooble
- **THEN** the section title SHALL be "Jobs By Jooble" and link to `https://jooble.org`.

#### Scenario: Displaying Developer Toggle

- **WHEN** the application is running in development mode (`import.meta.dev` is true)
- **THEN** the search results UI SHALL display a toggle button allowing the developer to switch the provider override between `'Auto'` and `'Reed'` in the UK, or `'Auto'`, `'Careerjet'`, and `'Jooble'` in the USA
- **AND** selecting an option SHALL trigger a re-fetch of the data using the newly selected provider mode.

### Requirement: Data Sources Page Update

The "Data sources" page SHALL describe the active live job-board intelligence providers (Reed for the UK; Careerjet and Jooble for the USA) alongside official government statistics (ONS and BLS), with no reference to Adzuna.

#### Scenario: Updating data source tiles

- **WHEN** a user visits the "Data sources" page
- **THEN** the live market intelligence tile SHALL reference Reed in `en-GB` and Careerjet & Jooble in `en-US`
- **AND** the page SHALL contain no mention of Adzuna.
