# Design: Codebase Security Hardening & Quality Remediation

## Context

Am I Underpaid allows recruiters to manage their accounts, purchase local territory sponsorships, and be granted national directory placement. Security is enforced through Firestore security rules (`firestore.rules`), server-side admin guard middleware (`server/middleware/admin-guard.ts`), and strict runtime configuration boundaries.

A recent codebase audit identified several targeted security and code quality findings:

1. **Critical Privilege Escalation in `firestore.rules` (C1)**: Authenticated recruiters can update their own user profile document (`/users/{userId}`) to set `ukNationalStatus: 'active'` or `usaNationalStatus: 'active'`. This immediately activates their agency lead-contact card across all national salary searches without payment, as the status fields were omitted from the restricted fields blacklist in `firestore.rules:32-35`.
2. **Missing Downstream HTTP Timeouts (I3)**: Third-party API calls in `server/utils/adzuna.ts`, `server/utils/reed.ts`, and `server/utils/jooble.ts` do not specify an HTTP timeout, risking request stalling during upstream outages.
3. **Linting & Code Smells (Nitpicks)**: Structure linting emits legacy warnings for 5 static data files, `discount.post.ts` performs redundant token validation, and `EmailVerification.vue` directly calls Firebase Auth SDK methods.

## Goals / Non-Goals

**Goals:**

- Eliminate the Firestore rules privilege escalation by blacklisting `ukNationalStatus`, `usaNationalStatus`, and `claims` from client writes in `firestore.rules`.
- Back the rules fix with comprehensive security tests in `tests/firestore.spec.ts`.
- Configure an explicit 6-second timeout (`timeout: 6000`) across all downstream market data API clients in `server/utils/adzuna.ts`, `server/utils/reed.ts`, and `server/utils/jooble.ts`.
- Eliminate structure-lint legacy warnings by registering static data lookup files in `scripts/structure-lint.ts`.
- Clean up redundant authorization code in `server/api/admin/recruiters/discount.post.ts`.
- Encapsulate user reload functionality inside `app/composables/useRecruiterAuth.ts` and refactor `app/components/Toast/EmailVerification.vue`.
- Resolve `@ts-expect-error` suppressions in `app/layouts/default.vue` with localized type-safe casting.

**Non-Goals:**

- Provisioning an external distributed Redis/KV cache for serverless rate limiting (tracked separately as an infrastructure enhancement).
- Integrating external telemetry/logging vendors into runtime code.

## Decisions

### 1. Firestore Security Rules Blacklist Hardening

- **Choice**: In `firestore.rules`, update both `allow create` and `allow update` under `match /users/{userId}` to blacklist:
  ```
  ['role', 'status', 'activeTerritories', 'basicDiscount', 'exclusiveDiscount', 'stripeSubscriptionId', 'ukNationalStatus', 'usaNationalStatus', 'claims']
  ```
- **Rationale**:
  - `ukNationalStatus` and `usaNationalStatus` are strictly managed server-side via `server/api/admin/recruiters/set-national.post.ts` and `server/api/stripe/webhook.post.ts` using the Firebase Admin SDK (which bypasses security rules).
  - `claims` and `role` are administrative privilege markers.
  - Adding these keys to `affectedKeys().hasAny(...)` prevents any authenticated client from self-granting national status or manipulating privileged fields via client SDK calls (`updateDoc`, `setDoc`).
- **Alternatives Considered**:
  - _Full client whitelist_: Define an allowed fields list (`['name', 'agency_name', 'agencyName', 'contactSettings', 'coveredCategories']`). Rejected to preserve rule structure and avoid breaking unexpected client fields, while blacklist strictly closes all attack surfaces.

### 2. Downstream API Client HTTP Timeouts

- **Choice**: Add `timeout: 6000` (6,000 milliseconds / 6 seconds) to `$fetch` options in:
  - `server/utils/adzuna.ts`: `fetchAdzunaJobs` and `fetchAdzunaHistogram`
  - `server/utils/reed.ts`: `fetchReedData`
  - `server/utils/jooble.ts`: `fetchJoobleData`
- **Rationale**:
  - Upstream job board APIs (Adzuna, Reed, Jooble) can experience network latency spikes.
  - An explicit 6-second timeout ensures that if an upstream provider hangs, the call fails fast and triggers the regional fallback provider (e.g. Reed $\to$ Adzuna for UK, Adzuna $\to$ Jooble for USA) well before Vercel's global 10–15s function timeout.
- **Alternatives Considered**:
  - _3-second timeout_: Too aggressive; legitimate heavy queries on Adzuna/Reed can take 3–4 seconds.
  - _10-second timeout_: Too close to Vercel's function timeout, leaving no time for fallback execution.

### 3. Structure Lint Exemption Configuration

- **Choice**: In `scripts/structure-lint.ts`, add the following static lookup files to `TEST_EXEMPT_FILES`:
  - `'utils/bands/uk.ts'`
  - `'utils/bands/usa.ts'`
  - `'utils/locations/uk.ts'`
  - `'utils/locations/usa.ts'`
  - `'utils/seedData.ts'`
- **Rationale**:
  - These files are static data tables whose unit tests reside in `utils/tests/` (e.g. `utils/tests/bands-uk.spec.ts`).
  - Structure-lint expects tests in adjacent `tests/` subdirectories (e.g. `utils/bands/tests/uk.spec.ts`), causing 5 legacy warnings on every `pnpm lint` run. Adding them to `TEST_EXEMPT_FILES` removes noise without sacrificing test coverage.

### 4. Admin Guard Redundancy & Auth Encapsulation

- **Choice**:
  - In `server/api/admin/recruiters/discount.post.ts`: Remove manual `getRequestHeader(event, 'authorization')` and `getAuth().verifyIdToken(token)` lines. `server/middleware/admin-guard.ts` already intercepts all `/api/admin/**` routes and verifies admin identity.
  - In `app/composables/useRecruiterAuth.ts`: Add `reloadUser = async (): Promise<void> => { const auth = getAuth(); await auth.currentUser?.reload(); }`.
  - In `app/components/Toast/EmailVerification.vue`: Replace direct `getAuth().currentUser?.reload()` with `reloadUser()`.
  - In `app/layouts/default.vue`: Provide localized typing for unhead `Link` and `Meta` objects to eliminate `@ts-expect-error` comments.

## Risks / Trade-offs

- **[Risk: Blacklisting fields breaks legitimate client-side profile editing]**  
  → _Mitigation_: Verified that client-side profile components (`app/pages/recruiter/profile.vue`, `app/components/Territory/List.vue`) only modify `agency_name`, `agencyName`, and `contactSettings`. National status and discounts are exclusively edited through `/api/admin/` endpoints.
- **[Risk: 6-second timeout aborts slow but successful upstream searches]**  
  → _Mitigation_: 6 seconds is twice the 99th percentile response time for Reed/Adzuna API endpoints under normal conditions. On timeout, the regional fallback provider immediately takes over to serve user queries.
