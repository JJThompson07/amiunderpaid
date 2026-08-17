# Implementation Tasks

## 1. Write Unit Tests

- [x] 1.1 Create `server/utils/tests/adzuna.spec.ts`.
- [x] 1.2 Write test block for `sanitizeAdzunaData` (covering primitives, objects, nested objects, arrays).
- [x] 1.3 Write test block for `generateCacheKey` (covering whitespace, symbols, and missing fields).

## 2. Validation

- [x] 2.1 Run `pnpm vitest run server/utils/tests/adzuna.spec.ts` to ensure tests pass.
- [x] 2.2 Run `pnpm test:coverage` to confirm `server/utils/adzuna.ts` now meets the >80% coverage requirement.
