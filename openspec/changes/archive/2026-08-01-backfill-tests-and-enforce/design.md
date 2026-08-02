## Context

See proposal.md for motivation. We need to backfill unit tests for legacy composables/utils and introduce Playwright E2E testing to the repository. The repo already uses Vitest for unit tests, but lacks Playwright configuration and comprehensive test coverage.

## Goals / Non-Goals

**Goals:**

- Set up `@playwright/test` for E2E testing.
- Write E2E tests for core flows: Login, Search, and Checkout.
- Backfill missing unit tests in `~/utils/` and `~/composables/` using Vitest.
- Update `AGENTS.md` to ensure autonomous agents are strictly bound to passing these tests.
- Integrate the test execution scripts into the standard workflow (e.g. `pnpm test:e2e`).

**Non-Goals:**

- Not achieving 100% test coverage across every single UI component.
- Not altering any application source code behavior (this is strictly test infrastructure).

## Decisions

- **Playwright over Cypress**: Playwright integrates cleanly with Nuxt 3, runs faster, and supports all modern browser engines seamlessly.
- **Test Locations**:
  - E2E tests will live in a top-level `e2e/` directory.
  - Unit tests will continue to live in `tests/` directories adjacent to their source files.
- **Mocking**: For E2E tests, we will mock Stripe and Algolia where necessary, or point to dedicated staging environments to ensure deterministic runs.

## Risks / Trade-offs

- **Risk**: E2E tests against Firebase/Stripe can be flaky.
  **Mitigation**: Use Playwright's built-in retries and prefer mocking external API responses when strict E2E behavior isn't being explicitly tested.
- **Risk**: Agents ignoring the new AGENTS.md rules.
  **Mitigation**: Make the rule explicitly block PRs and apply phases if the tests do not pass, formatting it clearly in the guidelines.
