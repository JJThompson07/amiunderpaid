# Spec Delta: dev-provider-toggle

## MODIFIED Requirements

### Requirement: Search API Provider Override

When the `devProviderOverride` is set to a specific provider ('adzuna', 'reed', or 'jooble'), the search composition and market data layer MUST force the application to use that provider's data.

#### Scenario: Override set to Reed
- **WHEN** the `devProviderOverride` is set to 'reed'
- **AND** a search is executed
- **THEN** the system MUST bypass the default routing and directly fetch from the Reed API.

#### Scenario: Override set to Auto
- **WHEN** the `devProviderOverride` is set to 'auto'
- **AND** a search is executed
- **THEN** the system MUST follow regional production behavior (UK: Reed primary with Adzuna fallback; USA: Adzuna primary with Jooble fallback).
