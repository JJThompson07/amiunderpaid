# Proposal: Adzuna Utils Unit Tests

## 1. Why

The `server/utils/adzuna.ts` file contains critical logic for sanitizing nested objects from the Adzuna API and generating consistent cache keys. Currently, this file lacks unit tests, which violates the strict 80% coverage requirement. If a bug is introduced in the sanitization logic or cache generation, it could lead to data corruption in Firestore or cache misses, degrading performance.

## 2. What Changes

- Add comprehensive unit tests in `server/utils/tests/adzuna.spec.ts`.
- The tests will cover the recursive object sanitization function (`sanitizeAdzunaData`) and the caching string formatter (`generateCacheKey`).

## 3. Scope

- Create `server/utils/tests/adzuna.spec.ts`.
- Assert minimum 80% coverage is achieved for `adzuna.ts`.

## 4. Non-Goals

- Modifying the existing implementation of `server/utils/adzuna.ts` (unless a critical bug is discovered during test creation).
