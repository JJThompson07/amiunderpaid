# Tasks

## 1. Firestore Security Rules Hardening (C1)

- [ ] 1.1 Update `firestore.rules` under `match /users/{userId}` to add `ukNationalStatus`, `usaNationalStatus`, and `claims` to the forbidden fields blacklist in both `allow create` and `allow update` rules.
- [ ] 1.2 Add comprehensive rules tests in `tests/firestore.spec.ts` asserting that authenticated users cannot set or update `ukNationalStatus`, `usaNationalStatus`, or `claims` on their profile, while administrators can modify them, and verify tests pass with `pnpm test:rules`.

## 2. Downstream API Client Timeouts (I3)

- [ ] 2.1 Add `timeout: 6000` to outbound `$fetch` options in `server/utils/adzuna.ts` (`fetchAdzunaJobs` and `fetchAdzunaHistogram`), `server/utils/reed.ts` (`fetchReedData`), and `server/utils/jooble.ts` (`fetchJoobleData`).
- [ ] 2.2 Update unit test assertions in `server/utils/tests/adzuna.spec.ts`, `server/utils/tests/reed.spec.ts`, and `server/utils/tests/jooble.spec.ts` to assert that `timeout: 6000` is forwarded in `$fetch` options, and verify tests pass with `pnpm test -- server/utils/tests/adzuna.spec.ts server/utils/tests/reed.spec.ts server/utils/tests/jooble.spec.ts`.

## 3. Developer Tooling & Linting Hygiene (Nitpicks)

- [ ] 3.1 Register static lookup files (`utils/bands/uk.ts`, `utils/bands/usa.ts`, `utils/locations/uk.ts`, `utils/locations/usa.ts`, `utils/seedData.ts`) in `TEST_EXEMPT_FILES` in `scripts/structure-lint.ts` and verify with `pnpm lint:structure`.
- [ ] 3.2 Remove redundant authorization header parsing and `verifyIdToken` call from `server/api/admin/recruiters/discount.post.ts` and verify unit test passes with `pnpm test -- server/api/admin/recruiters/tests/discount.spec.ts`.
- [ ] 3.3 Export `reloadUser(): Promise<void>` in `app/composables/useRecruiterAuth.ts`, refactor `app/components/Toast/EmailVerification.vue` to use it, and update `app/composables/tests/useRecruiterAuth.spec.ts`.
- [ ] 3.4 Refactor `useHead` link and meta entries in `app/layouts/default.vue` with localized type-safe casting to resolve `@ts-expect-error` suppressions and verify with `pnpm typecheck`.

## 4. Verification & Gate Checks

- [ ] 4.1 Run repository linting suite `pnpm lint` and confirm zero errors, zero warnings, and clean formatting.
- [ ] 4.2 Run unit test coverage gate `pnpm test:coverage` and confirm all files achieve $\ge 80\%$ on statements, branches, functions, and lines.
- [ ] 4.3 Run full test verification suite `pnpm test:verify` and confirm 100% pass across linting, coverage, e2e, and firestore rules.
