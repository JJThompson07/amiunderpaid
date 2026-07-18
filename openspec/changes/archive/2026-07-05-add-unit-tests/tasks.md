## 1. Documentation & Workflow Updates

- [x] 1.1 Update `CODE_STANDARDS.md` to formally require unit tests for all new utilities and composables.
- [x] 1.2 Update `AGENTS.md` in the "Phase 3: Validate" section to explicitly instruct autonomous agents to run the project's unit test suite (e.g., `pnpm vitest run`) and ensure all tests pass before proceeding to archive.

## 2. Baseline Unit Tests

- [x] 2.1 Identify and implement a unit test suite for at least 2 core utility functions in `app/utils/` (or `shared/utils/`) to serve as a reference implementation.
- [x] 2.2 Identify and implement a unit test suite for at least 1 core composable in `app/composables/` to serve as a reference implementation.
- [x] 2.3 Verify the entire test suite runs successfully with `pnpm vitest run`.
