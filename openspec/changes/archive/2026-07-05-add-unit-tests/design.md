## Context

The repository has Vitest installed, but testing is not strictly enforced in the development workflow, and many core utilities and composables lack coverage. Given that autonomous agents (like Antigravity) are frequently contributing to the codebase, we need a robust, automated way to verify that changes do not break existing functionality. 

## Goals / Non-Goals

**Goals:**
- Implement foundational unit tests for existing core utilities (`app/utils/`) and composables (`app/composables/`).
- Update `CODE_STANDARDS.md` to formally require unit tests for new utility or composable functions.
- Update `AGENTS.md` to require the agent to run the unit tests (`pnpm vitest run` or equivalent) as part of the validation phase before archiving any OpenSpec change.

**Non-Goals:**
- Achieving 100% test coverage across the entire Nuxt application immediately.
- Implementing end-to-end (E2E) testing with Cypress or Playwright.
- Writing tests for Vue UI components (this proposal focuses on logic/utilities for now).

## Decisions

- **Test Runner:** We will continue using the existing `vitest` setup. It integrates well with Nuxt and is extremely fast.
- **Agent Enforcement:** We will modify `AGENTS.md` to add a specific instruction under the "Phase 3: Validate" section, instructing the agent to run the test suite to verify that its own changes haven't broken the build.
- **Initial Test Scope:** We will write tests for at least 2-3 core utility/scoring functions to establish the pattern, providing examples that future agents can emulate.

## Risks / Trade-offs

- **Risk:** Agents may struggle to write complex mock setups for composables.
  - **Mitigation:** We will focus initial testing efforts on pure utility functions (e.g., scoring logic, data transformations) which are easier to test. For composables, we will provide clear documentation or mock setups if needed.
- **Risk:** Running tests adds time to the agent's validation loop.
  - **Mitigation:** The reliability gained far outweighs the minimal execution time of Vitest.
