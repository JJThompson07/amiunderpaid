## Purpose
Reinstate the global 80% minimum test coverage threshold for the `server/**` directory by removing legacy exemptions and systematically implementing unit tests for all exposed API endpoints.

## MODIFIED Requirements

### Requirement: Global Coverage Enforcement
The system SHALL strictly enforce an 80% coverage threshold (Statements, Branches, Functions, Lines) for all server-side logic in continuous integration.

#### Scenario: Running vitest coverage
- **GIVEN** `vitest.config.ts` no longer exempts `server/**/*.ts`
- **WHEN** the `pnpm test:coverage` script executes
- **THEN** all server endpoints must report $\ge$ 80% coverage on all four metrics, failing the pipeline if they fall below.

### Requirement: Admin & User Endpoints Tested
The system SHALL have comprehensive unit tests mocking external dependencies (Firestore, Algolia) for all backend functionality.

#### Scenario: Testing API endpoints
- **WHEN** a server test executes a mocked `h3` event against an endpoint (e.g., `/api/admin/clean-cache` or `/api/user/leads/submit`)
- **THEN** the test successfully asserts the endpoint's response shape, error handling, and correct integration with backend services without actually hitting the live database.
