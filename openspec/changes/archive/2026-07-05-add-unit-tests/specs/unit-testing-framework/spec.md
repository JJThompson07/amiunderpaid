## ADDED Requirements

### Requirement: Unit Testing Enforcement
The system's development workflow SHALL require passing unit tests for all core utility and logic functions before any change is archived.

#### Scenario: Code modification
- **WHEN** a developer or autonomous agent modifies core logic or utilities
- **THEN** they must write or update corresponding unit tests
- **AND** the entire test suite must pass before the change is considered complete.

### Requirement: Agent Validation Protocol
Autonomous agents operating in the repository SHALL execute the test suite during their validation phase.

#### Scenario: Agent validating a change
- **WHEN** an agent reaches Phase 3: Validate in the OpenSpec workflow
- **THEN** it runs the project's test suite (e.g., `pnpm vitest run`)
- **AND** if any tests fail, the agent must fix the underlying implementation or test before proceeding to Phase 4: Archive.
