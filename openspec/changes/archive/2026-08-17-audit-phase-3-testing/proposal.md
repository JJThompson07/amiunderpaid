# Phase 3: Test Suite Extension

## Why

Currently, the coverage gate measures only a portion of the repository. 40 server routes and 98 Vue files have no test coverage. We need to introduce extensive rules testing for Firestore, mathematical assertions for our algorithms, and a more robust E2E setup for SSR execution to meet our 80% coverage mandate truthfully.

## What

- Implement a dedicated Firestore rules test suite using `@firebase/rules-unit-testing`.
- Extend unit tests for `calculateBenchmarkScore`, `calculateConfidenceScore`, and `buildHistogramBuckets`.
- Improve API fallback E2E tests to actually execute the real paths using `devProvider` overrides.
- Introduce an SSR-enabled Playwright E2E project.
- Extend `vitest.config.ts` coverage gates to the entire `server/` directory.
- Remove invalid `v8 ignore start` blocks in `useLocationEngine.ts` and `uk.ts` and test them properly.

## Scope

Touches the testing infrastructure (`vitest`, `playwright`, `tests/` directories, `server/api/admin/tests/`).

## Non-Goals

- Fixing application correctness logic outside of what the tests explicitly expose.
