## Purpose

Provides a development-only mechanism to manually switch between the Adzuna and Reed search API providers to facilitate local testing without altering actual quota limits or forcing error states.

## ADDED Requirements

### Requirement: Dev Provider State Tracking

The system MUST track a development-only state for the selected provider (e.g. 'auto', 'adzuna', 'reed') that defaults to 'auto'.

#### Scenario: Running in development mode

- **WHEN** the application is running locally (`import.meta.dev`)
- **THEN** the system SHALL expose a global or composable state for `devProviderOverride` that defaults to 'auto'.

### Requirement: Search API Provider Override

When the `devProviderOverride` is set to a specific provider ('adzuna' or 'reed'), the search composition layer MUST force the application to use that provider's data.

#### Scenario: Override set to Reed

- **WHEN** the `devProviderOverride` is set to 'reed'
- **AND** a search is executed
- **THEN** the system MUST bypass the Adzuna primary request and directly fetch from the Reed API.

#### Scenario: Override set to Auto

- **WHEN** the `devProviderOverride` is set to 'auto'
- **AND** a search is executed
- **THEN** the system MUST follow the standard production behavior (Adzuna primary, Reed fallback on 403).
