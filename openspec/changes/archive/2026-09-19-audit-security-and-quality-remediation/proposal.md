# Proposal: Codebase Security Hardening & Quality Remediation

## Why

A comprehensive codebase audit identified a critical security vulnerability in Firestore client rules alongside downstream API resilience issues and code hygiene gaps:

1. **National Recruiter Tier Privilege Escalation in `firestore.rules` (Critical C1)**: Under `match /users/{userId}`, profile write rules verify that incoming client writes do not touch a blacklisted set of sensitive fields: `['role', 'status', 'activeTerritories', 'basicDiscount', 'exclusiveDiscount', 'stripeSubscriptionId']`. When the National Recruiter Tier was introduced, `ukNationalStatus` and `usaNationalStatus` (and `claims`) were stored directly on `users/{userId}` documents. Because neither status field was added to the blacklist in `firestore.rules`, any authenticated recruiter can call `updateDoc(doc(db, 'users', uid), { ukNationalStatus: 'active' })` directly from their browser. The public search endpoint (`server/api/user/search/recruiter-card.get.ts`) queries `users` with `where(targetStatusKey, '==', 'active')` and immediately serves their contact card nationwide, allowing recruiters to self-grant nationwide visibility without paying the monthly Stripe subscription (£50–£300/mo).
2. **Manual Security Rules Deployment Risk (CI/CD Gap)**: Currently, `firestore.rules` is tested locally and in CI via emulator unit tests (`pnpm test:rules`), but GitHub Actions does not automatically deploy the rules to live Firebase on merge to `main`. Relying on manual CLI or console updates creates a deployment synchronization gap where code is shipped to production while rules remain out-of-date.
3. **Missing HTTP Request Timeouts on Downstream Market Data Providers (Improvement I3)**: Outbound `$fetch` calls to upstream job boards in `server/utils/adzuna.ts`, `server/utils/reed.ts`, and `server/utils/jooble.ts` lack explicit timeout configurations. Network latency or hangs from upstream providers can stall requests until Vercel's global 10–15s lambda timeout, blocking prompt primary-to-fallback failover. Adding an explicit `timeout: 6000` (6 seconds) ensures timely fallback routing.
4. **Linting, Typing & Refactoring Hygiene (Nitpicks)**:
   - `scripts/structure-lint.ts` emits legacy unit test warnings for 5 static lookup files (`utils/bands/uk.ts`, `utils/bands/usa.ts`, `utils/locations/uk.ts`, `utils/locations/usa.ts`, `utils/seedData.ts`) whose tests live in `utils/tests/`; registering them in `TEST_EXEMPT_FILES` cleans up lint output.
   - `server/api/admin/recruiters/discount.post.ts` contains redundant manual ID token verification in the handler body that duplicates the global `verifyAdmin` check in `server/middleware/admin-guard.ts`.
   - `app/components/Toast/EmailVerification.vue` directly invokes `getAuth().currentUser?.reload()`, bypassing the `useRecruiterAuth` composable encapsulation.
   - `app/layouts/default.vue` contains suppressions for untyped `@nuxtjs/i18n` `MetaAttrs` in `useHead` that can be resolved with clean type definitions.

## What Changes

- **Firestore Security Rules Hardening & CD Automation (`firestore.rules`, `.github/workflows/ci.yml`, `package.json`)**:
  - Add `ukNationalStatus`, `usaNationalStatus`, and `claims` to the forbidden fields blacklist in both `allow create` and `allow update` rules for `/users/{userId}`.
  - Update `tests/firestore.spec.ts` with explicit security tests asserting that authenticated users are denied when setting or updating `ukNationalStatus`, `usaNationalStatus`, or `claims`, while admin operations succeed.
  - Add `deploy:rules` script to `package.json` (`firebase deploy --only firestore:rules --project "$FIREBASE_PROJECT_ID" --token "$FIREBASE_TOKEN"`).
  - Add an automated `deploy-rules` job in `.github/workflows/ci.yml` that runs on `push` to `main` after `lint`, `unit-tests`, and `e2e-tests` succeed, deploying rules to Firebase authenticated via a new `FIREBASE_TOKEN` repo secret (no service-account configuration exists in this repo today — verified against `.github/workflows/*.yml` before choosing this approach).
- **Provider Outbound HTTP Timeouts (`server/utils/adzuna.ts`, `server/utils/reed.ts`, `server/utils/jooble.ts`)**:
  - Add explicit `timeout: 6000` to all `$fetch` requests across Adzuna (jobs and histogram), Reed (jobs search), and Jooble (jobs search).
  - Update adjacent unit tests (`server/utils/tests/adzuna.spec.ts`, `server/utils/tests/reed.spec.ts`, `server/utils/tests/jooble.spec.ts`) to verify timeout configuration.
- **Structure Lint Exemption Registration (`scripts/structure-lint.ts`)**:
  - Add `utils/bands/uk.ts`, `utils/bands/usa.ts`, `utils/locations/uk.ts`, `utils/locations/usa.ts`, and `utils/seedData.ts` to `TEST_EXEMPT_FILES`.
- **Admin Discount Endpoint Refactor (`server/api/admin/recruiters/discount.post.ts`)**:
  - Remove redundant manual authorization header parsing and `getAuth().verifyIdToken(token)` call, relying on `server/middleware/admin-guard.ts`.
- **Recruiter Auth Composable Encapsulation (`app/composables/useRecruiterAuth.ts`, `app/components/Toast/EmailVerification.vue`)**:
  - Export `reloadUser(): Promise<void>` on `useRecruiterAuth()`.
  - Refactor `EmailVerification.vue` to invoke `reloadUser()` instead of calling `getAuth().currentUser?.reload()` directly.
- **Default Layout i18n Type Cleanliness (`app/layouts/default.vue`)**:
  - Replace `@ts-expect-error` comments on `useHead` link/meta properties with typed casting satisfying unhead's strict `Link` and `Meta` interfaces.

### Scope & Non-Goals

- **In Scope**:
  - Hardening `firestore.rules` against national status and claims self-granting with full rules test coverage.
  - Adding automated `firestore.rules` deployment to GitHub Actions on merge to `main`.
  - Adding 6-second timeout configuration to `server/utils/adzuna.ts`, `server/utils/reed.ts`, and `server/utils/jooble.ts`.
  - Structure lint exemptions in `scripts/structure-lint.ts`.
  - Code hygiene in `discount.post.ts`, `useRecruiterAuth.ts`, `EmailVerification.vue`, and `default.vue`.
- **Non-Goals**:
  - Provisioning an external distributed Redis/KV cluster for serverless rate limiting (I1 is tracked as an infrastructure architectural enhancement).
  - Introducing third-party telemetry/logging vendor SDKs (e.g. Sentry/Datadog) into the runtime stack.
  - Altering public API schemas or Stripe webhook processing logic.

## Capabilities

### New Capabilities

_(None)_

### Modified Capabilities

- `firestore-rules`: Update Requirement "User profile write restrictions" and "Strict profile field protection" to include `ukNationalStatus`, `usaNationalStatus`, and `claims` in the client write blacklist, and add Requirement "Automated Firestore Rules Deployment" to CI/CD pipeline on `main` branch push.
- `reed-api-fallback`: Update Requirement "Reed API Job Data Fetching" to require a 6-second timeout on outbound HTTP requests.
- `adzuna-adapter`: Update outbound search and histogram requirements to require a 6-second timeout.
- `jooble-api-fallback`: Update Requirement "Jooble API Job Data Fetching" to require a 6-second timeout on outbound HTTP requests.

## Impact

- **Security & Rules**:
  - `firestore.rules`
  - `tests/firestore.spec.ts`
- **CI/CD & Deployment**:
  - `.github/workflows/ci.yml`
  - `package.json`
- **Server Utilities & Outbound Clients**:
  - `server/utils/adzuna.ts`
  - `server/utils/reed.ts`
  - `server/utils/jooble.ts`
  - `server/utils/tests/adzuna.spec.ts`
  - `server/utils/tests/reed.spec.ts`
  - `server/utils/tests/jooble.spec.ts`
- **Admin API Endpoints**:
  - `server/api/admin/recruiters/discount.post.ts`
  - `server/api/admin/recruiters/tests/discount.spec.ts`
- **Frontend Components & Composables**:
  - `app/composables/useRecruiterAuth.ts`
  - `app/composables/tests/useRecruiterAuth.spec.ts`
  - `app/components/Toast/EmailVerification.vue`
  - `app/layouts/default.vue`
- **Developer Tooling**:
  - `scripts/structure-lint.ts`
