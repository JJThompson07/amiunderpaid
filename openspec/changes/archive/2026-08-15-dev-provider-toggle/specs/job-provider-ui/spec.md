## MODIFIED Requirements

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
