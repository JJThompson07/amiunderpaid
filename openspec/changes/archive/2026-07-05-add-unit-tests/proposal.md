## Why

To ensure the reliability and maintainability of the application, we need to implement unit tests across the core functions. While Vitest is already set up, we currently lack a comprehensive test suite and strict enforcement. Adding unit tests and updating our coding standards will catch regressions early and ensure all future agent-driven or manual changes are verified before merging.

## What Changes

- Implement unit tests for critical utility functions and composables using the existing Vitest setup.
- Update `CODE_STANDARDS.md` to mandate that all new code or modifications must include passing unit tests.
- Update the agent rules (e.g., `AGENTS.md`) to explicitly instruct the agent to run and pass unit tests as part of the validation phase before archiving any change.

## Capabilities

### New Capabilities

- `unit-testing-framework`: Establishing the baseline unit tests for core utilities and composables using Vitest, and integrating test execution into the agent's validation workflow.

### Modified Capabilities

- (None)

## Impact

- **Affected Code**: Various utility functions (`app/utils/`) and composables (`app/composables/`) will have corresponding `.spec.ts` or `.test.ts` files created or updated.
- **Workflow**: `CODE_STANDARDS.md` and `AGENTS.md` will be updated, strictly altering how future changes are validated. Every future OpenSpec change will require passing the Vitest suite during Phase 3 (Validate).
