## MODIFIED Requirements

### Requirement: Dev Provider State Tracking

The system MUST track a development-only state for the selected provider (`'auto'`, `'reed'`, `'careerjet'`, or `'jooble'`) that defaults to `'auto'`.

#### Scenario: Running in development mode

- **WHEN** the application is running locally (`import.meta.dev`)
- **THEN** the system SHALL expose a composable state for `devProviderOverride` that defaults to `'auto'`.

### Requirement: Search API Provider Override

When the `devProviderOverride` is set to a specific provider (`'reed'`, `'careerjet'`, or `'jooble'`), the search composition and market data layer MUST force the application to use that provider's data.

#### Scenario: Override set to Reed

- **WHEN** the `devProviderOverride` is set to `'reed'`
- **AND** a search is executed
- **THEN** the system MUST bypass the default routing and directly fetch from the Reed API.

#### Scenario: Override set to Careerjet

- **WHEN** the `devProviderOverride` is set to `'careerjet'`
- **AND** a search is executed
- **THEN** the system MUST bypass default routing and directly fetch from the Careerjet API (or return the deterministic Careerjet fixture when `process.env.E2E === 'true'`).

#### Scenario: Override set to Auto

- **WHEN** the `devProviderOverride` is set to `'auto'`
- **AND** a search is executed
- **THEN** the system MUST follow regional production behavior (UK: Reed only; USA: Careerjet primary with Jooble fallback).
