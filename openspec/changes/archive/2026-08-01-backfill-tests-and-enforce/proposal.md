## Why

The repository needs to be absolutely bulletproof against regressions and breaking changes. Currently, there are legacy areas of the codebase without adequate unit test coverage, and we lack a comprehensive suite of Playwright E2E tests to verify critical user journeys. Additionally, we need to enforce that any autonomous agents working in this repository automatically verify their work against this testing infrastructure.

## What Changes

- Backfill comprehensive unit tests for legacy utilities and composables using Vitest.
- Introduce and implement Playwright E2E tests for the most critical application flows (e.g., authentication, search, checkout).
- Update `AGENTS.md` with explicit, strict rules ensuring that all autonomous changes MUST pass unit tests, Playwright tests, linting, and formatting before being proposed or applied.
- Ensure the CI pipeline or local validation steps are updated to include Playwright test execution.

## Capabilities

### New Capabilities

- None (This is a tooling, testing, and infrastructure change).

### Modified Capabilities

- None.

## Impact

- **Code Quality**: Significant increase in test coverage and reliability.
- **Agent Governance**: `AGENTS.md` will strictly enforce testing, preventing agents from skipping test validation.
- **Build/CI**: Playwright tests will be integrated into the standard verification process.
- **Zero Product Changes**: No end-user facing features are being modified; this is strictly an infrastructure/quality effort.
