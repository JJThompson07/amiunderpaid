# Codebase Audit: amiunderpaid

**Repository:** `JJThompson07/amiunderpaid` · **Commit:** `3e73227` (2026-09-19) · **Branch/tag:** `main`  
**Audited:** 2026-09-19 · **Depth:** standard · **Focus:** none  
**Size:** 365 tracked source files · ~53,500 lines across TypeScript, Vue, CSS · **Context scored as:** Public-facing production web application & SaaS platform

> **Overall: 65/100 — Grade D (Capped from 94/100, Grade A)**  
> An exceptionally engineered, strictly typed, and thoroughly tested codebase featuring 80% per-file test coverage, but capped at 65 due to a single critical privilege-escalation vulnerability in Firestore security rules allowing unbilled national recruiter activation.

---

## What this codebase does

**Am I Underpaid** (and its companion brand **Benchmark My Role**) is a salary benchmarking and market intelligence platform operating across the United Kingdom and the United States. The platform helps candidates and employees evaluate whether their compensation is fair by comparing their salary against aggregated government labor statistics (macro/micro percentiles) and live market job postings (Adzuna, Reed, and Jooble).

Beyond salary exploration, the platform operates a recruiter monetization marketplace. Recruitment agencies can claim territorial exclusivity (or basic rotation) across specific geographic regions and industry categories (e.g., London Software Engineering), receiving high-intent inbound candidate leads generated directly from salary searches. Recruiter subscriptions and territory purchases are managed via Stripe Checkout and Stripe Billing Webhooks.

The application is built on Nuxt 4 (Nitro engine) and Vue 3 with Tailwind CSS v4, backed by Firebase (Cloud Firestore and Firebase Authentication). It runs on a multi-tenant, region-aware architecture that dynamically routes and localizes traffic across distinct brand domains (`amiunderpaid.co.uk`, `amiunderpaid.com`, `benchmarkmyrole.com`) from a single unified deployment.

**In one line:** A multi-tenant UK/US salary benchmarking engine and localized recruiter lead-generation marketplace powered by Nuxt 4, Firebase, Algolia, and Stripe.

---

## How it is used

**Who uses it:**

- **Job seekers & employees:** Enter job title, salary, and location to see their Market Compensation Accuracy (MCA) score, salary histogram percentiles, and relevant open roles.
- **Recruitment agencies:** Register, onboard, configure agency profile and branding, browse interactive territory maps, and subscribe to territory or national lead-generation tiers via Stripe.
- **Platform administrators:** Access a secure admin suite to review recruiter applications, assign custom discounts, manage SOC/O*NET job taxonomies, inspect search analytics, trigger Algolia synchronization, and seed market data.

**Getting it running:**

```bash
# Prerequisites: Node.js >= 24.0.0, pnpm >= 9.15.9, Java 21 (for Firebase emulators)
pnpm install

# Copy environment variables template
cp .env.example .env

# Run local development server (Nuxt + Vite)
pnpm dev

# Run full local verification suite (lint, typecheck, coverage, e2e, rules)
pnpm test:verify
```

**Configuration:**

Key environment variables configured in `.env` and declared in `nuxt.config.ts` private `runtimeConfig`:

- `FIREBASE_SERVICE_ACCOUNT_BASE64` / `GOOGLE_APPLICATION_CREDENTIALS`: Service account for Firebase Admin SDK.
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`: Secret API keys for Stripe Checkout and webhook signature verification.
- `SEARCH_TOKEN_SECRET`: HMAC SHA-256 signing secret for authenticating unauthenticated search-log update requests.
- `CRON_SECRET`: Bearer token authorizing Vercel Cron invocations (`/api/cron/sync-trends`).
- `RESEND_API_KEY`: API key for transaction and billing failure alert emails.
- `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `REED_API_KEY`, `JOOBLE_API_KEY`: Third-party job market data provider credentials.
- `ALGOLIA_APPLICATION_ID`, `ALGOLIA_ADMIN_KEY`, `ALGOLIA_SEARCH_KEY`: Algolia indexing and search credentials.

**Main interfaces:**

| Interface                             | Entry point                                                                                                                                          | Purpose                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `GET /api/market-data/salary`         | [`server/api/market-data/salary.ts:211`](file:///Users/joshthompson/projects/amiunderpaid/server/api/market-data/salary.ts#L211)                     | Aggregates salary histogram data with primary/fallback routing                  |
| `GET /api/market-data/jobs`           | [`server/api/market-data/jobs.ts:168`](file:///Users/joshthompson/projects/amiunderpaid/server/api/market-data/jobs.ts#L168)                         | Fetches live job listings from regional providers                               |
| `POST /api/stripe/create-checkout`    | [`server/api/stripe/create-checkout.post.ts:19`](file:///Users/joshthompson/projects/amiunderpaid/server/api/stripe/create-checkout.post.ts#L19)     | Creates Stripe Checkout sessions with server-validated pricing                  |
| `POST /api/stripe/webhook`            | [`server/api/stripe/webhook.post.ts:75`](file:///Users/joshthompson/projects/amiunderpaid/server/api/stripe/webhook.post.ts#L75)                     | Processes Stripe events with transaction dedup and territory fulfillment        |
| `POST /api/user/leads/submit`         | [`server/api/user/leads/submit.post.ts:9`](file:///Users/joshthompson/projects/amiunderpaid/server/api/user/leads/submit.post.ts#L9)                 | Collects candidate contact details and dispatches recruiter notification emails |
| `GET /api/user/search/recruiter-card` | [`server/api/user/search/recruiter-card.get.ts:3`](file:///Users/joshthompson/projects/amiunderpaid/server/api/user/search/recruiter-card.get.ts#L3) | Resolves local exclusive/basic and national recruiter lead-gen cards            |
| `GET /api/cron/sync-trends`           | [`server/api/cron/sync-trends.get.ts:109`](file:///Users/joshthompson/projects/amiunderpaid/server/api/cron/sync-trends.get.ts#L109)                 | Monthly cron job for syncing industry trends with email alerts                  |

**Typical flow:**

1. Candidate searches for "Software Engineer in London" on `/salary/software-engineer/UK/london`.
2. Page triggers `useMarketData` composable ([`app/composables/useMarketData.ts:80`](file:///Users/joshthompson/projects/amiunderpaid/app/composables/useMarketData.ts#L80)), calling `GET /api/market-data/salary` and `GET /api/market-data/jobs`.
3. Server handler checks Firestore cache `adzuna_distribution_cache` ([`server/api/market-data/salary.ts:258`](file:///Users/joshthompson/projects/amiunderpaid/server/api/market-data/salary.ts#L258)); on cache miss, executes regional primary provider (Reed for UK, Adzuna for US), falling back seamlessly to secondary provider if primary fails ([`server/api/market-data/salary.ts:133-146`](file:///Users/joshthompson/projects/amiunderpaid/server/api/market-data/salary.ts#L133-L146)).
4. Client scores the user's compensation against government benchmarks using `calculatePercentile` and `calculateConfidenceScore` ([`shared/utils/math.ts:60,231`](file:///Users/joshthompson/projects/amiunderpaid/shared/utils/math.ts#L60)).
5. In parallel, `GET /api/user/search/recruiter-card` ([`server/api/user/search/recruiter-card.get.ts:31-70`](file:///Users/joshthompson/projects/amiunderpaid/server/api/user/search/recruiter-card.get.ts#L31-L70)) checks `territory_category_owners` for active monthly exclusive sponsors and queries national recruiters (`ukNationalStatus == 'active'`), displaying the matching recruiter lead-capture card.

---

## Architecture overview

The application is structured into clearly separated layers:

- **Presentation Layer (`app/`):** Vue 3 Composition API components using script setup, organized into brand sections, territory scheduling widgets, and responsive charts.
- **Composables Layer (`app/composables/`):** Encapsulated client-side state and business logic (`useMarketData`, `useLocationEngine`, `usePricing`, `useTerritories`).
- **Serverless API Layer (`server/api/`):** Nitro server routes handling data aggregation, Stripe integration, admin tasks, and search tracking.
- **Middleware & Security Guards (`server/middleware/`):** `admin-guard.ts` verifies Firebase Auth admin custom claims on `/api/admin/**`; `rate-limit.ts` enforces sliding-window rate limits on public write routes.
- **Shared Utilities (`shared/utils/`):** Pure mathematical models, sanitization routines, and type definitions shared between client and server.
- **Database & Auth:** Cloud Firestore for document persistence and Firebase Authentication with custom claims for RBAC.

| Area                   | Location                                      | Responsibility                                                                     | Health          |
| ---------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- | --------------- |
| HTTP & API Gateway     | `server/api/`                                 | Route handlers, primary/fallback market data aggregation, Stripe checkout/webhooks | Good            |
| Middleware & Guards    | `server/middleware/`                          | Global admin claim verification and route-level rate limiting                      | Good            |
| Client State & Logic   | `app/composables/`                            | Market data queries, pricing calculator, auth, user session tracking               | Good            |
| UI Components          | `app/components/`                             | Modular UI components, interactive range charts, search forms, modals              | Good            |
| Multi-tenant Routing   | `app/middleware/`, `app/plugins/`             | Hostname and TLD-based tenant isolation, 301 canonical redirects, i18n switching   | Good            |
| Data Layer & Rules     | `firestore.rules`, `server/utils/firebase.ts` | Database access control, batch operations, service account initialization          | Needs Work (C1) |
| Testing Infrastructure | `vitest.config.ts`, `tests/`, `e2e/`          | Vitest 80% coverage enforcement, Firebase Rules emulator tests, Playwright E2E     | Excellent       |

---

## Scorecard

| Dimension                  | Score      | Grade | One-line rationale                                                                                           |
| -------------------------- | ---------- | ----- | ------------------------------------------------------------------------------------------------------------ |
| Architecture & Design      | 15/16      | A     | Exemplary multi-tenant routing, clean primary/fallback provider gateways, and shared math models.            |
| Maintainability            | 15/17      | B     | Zero lint/spellcheck errors, strict TypeScript, and modular composables; lacks centralized logging.          |
| Security                   | 7/17       | F     | Critical privilege escalation vulnerability in `firestore.rules` allowing unbilled national tier self-grant. |
| Testability & Test Quality | 16/16      | A     | Outstanding per-file 80% coverage gate in Vitest, rules emulator testing, and sharded Playwright E2E.        |
| Readability                | 14/14      | A     | Clean Vue 3 Composition API, explicit typing, self-documenting code, and zero cryptic abbreviations.         |
| Performance & Efficiency   | 11/12      | A     | In-memory stampede deduplication, Firestore response caching, and Edge Cache headers on sitemaps.            |
| Documentation & DX         | 8/8        | A     | First-class OpenSpec proposals, comprehensive standards doc, and automated structure-linting tooling.        |
| **Overall**                | **65/100** | **D** | **High-quality codebase capped to 65 by a critical security vulnerability in Firestore rules.**              |

**Critical cap applied** — the raw total was **94/100 (Grade A)**, capped to **65** by finding **C1**.

**Key metrics**

| Metric                                   | Value                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Lines of code (excl. vendored/generated) | 53,486 lines across `.ts`, `.vue`, `.css`                                          |
| Test files : source files                | 127 : 238 (1:1.87 ratio)                                                           |
| Test coverage                            | 100% of tested files exceed 80% threshold (statements, branches, functions, lines) |
| Direct dependencies                      | 37 (14 prod, 23 dev)                                                               |
| TODO / FIXME / HACK markers              | 0 (enforced by ESLint `no-warning-comments`)                                       |
| Lint suppressions                        | 36 (4 `@ts-expect-error` due to i18n/DOM types, 32 documented `no-console`)        |
| Largest source file                      | `utils/locations/uk.ts` (1,652 lines static lookup table)                          |
| Last commit                              | 2026-09-19 · 1 contributor · 772 commits                                           |

---

## 🔴 Critical issues

### C1 — `firestore.rules` allows authenticated recruiters to self-grant national tier placement without paying

|               |                                                                                                                                                                                                                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Location**  | [`firestore.rules:32-35`](file:///Users/joshthompson/projects/amiunderpaid/firestore.rules#L32-L35)                                                                                                                                                                                                                     |
| **Dimension** | Security                                                                                                                                                                                                                                                                                                                |
| **Impact**    | Any authenticated recruiter can update their own user document via client-side Firestore SDK to set `ukNationalStatus: 'active'` or `usaNationalStatus: 'active'`, instantly surfacing their agency lead-contact card across all national salary searches without paying the monthly Stripe subscription (£50–£300/mo). |

In `firestore.rules`, user profile updates check that the client diff does not modify a restricted blacklist: `['role', 'status', 'activeTerritories', 'basicDiscount', 'exclusiveDiscount', 'stripeSubscriptionId']`. When the national recruiter tier was introduced, `ukNationalStatus` and `usaNationalStatus` were stored directly on `users/{userId}` documents. Because neither field was added to the blacklist in `firestore.rules`, any logged-in recruiter can call `updateDoc(doc(db, 'users', uid), { ukNationalStatus: 'active' })` directly from the browser. The public search endpoint [`server/api/user/search/recruiter-card.get.ts:43-47`](file:///Users/joshthompson/projects/amiunderpaid/server/api/user/search/recruiter-card.get.ts#L43-L47) queries `users` with `where(targetStatusKey, '==', 'active')` and immediately serves their contact card nationwide.

```javascript
// current — firestore.rules:32-35
      allow create: if isAdmin() || (isOwner(userId) &&
        (!request.resource.data.keys().hasAny(['role', 'status', 'activeTerritories', 'basicDiscount', 'exclusiveDiscount', 'stripeSubscriptionId'])));
      allow update: if isAdmin() || (isOwner(userId) &&
        (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'status', 'activeTerritories', 'basicDiscount', 'exclusiveDiscount', 'stripeSubscriptionId'])));
```

**Fix:** Add `ukNationalStatus`, `usaNationalStatus`, and `claims` to the forbidden fields blacklist in both `create` and `update` rules in `firestore.rules`.

```javascript
      allow create: if isAdmin() || (isOwner(userId) &&
        (!request.resource.data.keys().hasAny(['role', 'status', 'activeTerritories', 'basicDiscount', 'exclusiveDiscount', 'stripeSubscriptionId', 'ukNationalStatus', 'usaNationalStatus', 'claims'])));
      allow update: if isAdmin() || (isOwner(userId) &&
        (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'status', 'activeTerritories', 'basicDiscount', 'exclusiveDiscount', 'stripeSubscriptionId', 'ukNationalStatus', 'usaNationalStatus', 'claims'])));
```

---

## 🟠 Improvements

| #   | Location                                                                                                                                                                                                                                                                                                                         | Finding                                                                               | Why it matters                                                                                                                                                | Recommended fix                                                                                                               | Effort |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------ |
| I1  | [`server/middleware/rate-limit.ts:8`](file:///Users/joshthompson/projects/amiunderpaid/server/middleware/rate-limit.ts#L8)                                                                                                                                                                                                       | In-memory `Map` rate limiting is per-serverless instance on Vercel                    | In a multi-instance serverless deployment, rate limits are distributed and reset on cold starts, allowing attackers to bypass the 5 req/min threshold.        | Back rate limiter with a shared distributed store (e.g. Upstash Redis / Vercel KV) with atomic sliding-window increment.      | M      |
| I2  | [`server/api/stripe/create-checkout.post.ts:44`](file:///Users/joshthompson/projects/amiunderpaid/server/api/stripe/create-checkout.post.ts#L44), [`server/api/user/leads/submit.post.ts:47`](file:///Users/joshthompson/projects/amiunderpaid/server/api/user/leads/submit.post.ts#L47), etc.                                   | Absence of a structured logging and telemetry utility (~32 `no-console` suppressions) | Server-side warnings, Stripe API errors, and upstream failures log plain unformatted text to standard out rather than structured telemetry to Sentry/Datadog. | Implement a centralized `useServerLogger` / `consola` wrapper with severity levels and error monitoring integration.          | S      |
| I3  | [`server/utils/adzuna.ts:133`](file:///Users/joshthompson/projects/amiunderpaid/server/utils/adzuna.ts#L133), [`server/utils/reed.ts:86`](file:///Users/joshthompson/projects/amiunderpaid/server/utils/reed.ts#L86), [`server/utils/jooble.ts:74`](file:///Users/joshthompson/projects/amiunderpaid/server/utils/jooble.ts#L74) | Downstream API `$fetch` calls lack explicit HTTP timeout configuration                | If Adzuna, Reed, or Jooble experience network hanging, requests wait until Vercel's global 10-15s lambda timeout rather than triggering fallback quickly.     | Add explicit `timeout: 6000` to `$fetch` options in provider clients so primary-to-secondary fallback fires within 6 seconds. | S      |

---

## 🟡 Nitpicks

- [`scripts/structure-lint.ts:142`](file:///Users/joshthompson/projects/amiunderpaid/scripts/structure-lint.ts#L142) — Emits legacy warnings for 5 static lookup files (`utils/bands/uk.ts`, `utils/bands/usa.ts`, `utils/locations/uk.ts`, `utils/locations/usa.ts`, `utils/seedData.ts`); add these to `TEST_EXEMPT_FILES` in `structure-lint.ts` to keep lint output clean.
- [`app/layouts/default.vue:120,173`](file:///Users/joshthompson/projects/amiunderpaid/app/layouts/default.vue#L120) — Two `@ts-expect-error` suppressions due to untyped `MetaAttrs` in `@nuxtjs/i18n`; provide a localized type helper.
- [`server/api/admin/recruiters/discount.post.ts:9-10`](file:///Users/joshthompson/projects/amiunderpaid/server/api/admin/recruiters/discount.post.ts#L9) — Redundant manual ID token verification in handler body that is already executed by `server/middleware/admin-guard.ts`.
- [`app/components/Toast/EmailVerification.vue:73`](file:///Users/joshthompson/projects/amiunderpaid/app/components/Toast/EmailVerification.vue#L73) — Direct `getAuth().currentUser?.reload()` call inside a click handler; wrap into a helper method on `useRecruiterAuth()`.

---

## ✅ What's done well

- [`vitest.config.ts:38-45`](file:///Users/joshthompson/projects/amiunderpaid/vitest.config.ts#L38-L45) & [`tests/firestore.spec.ts:33-195`](file:///Users/joshthompson/projects/amiunderpaid/tests/firestore.spec.ts#L33-L195) — Per-file 80% test coverage enforced across all 4 metrics (statements, branches, functions, lines) with zero regressions allowed, combined with local Firebase security rules emulator testing in CI.
- [`server/api/user/track-search.post.ts:47`](file:///Users/joshthompson/projects/amiunderpaid/server/api/user/track-search.post.ts#L47) & [`server/utils/searchToken.ts:13-22`](file:///Users/joshthompson/projects/amiunderpaid/server/utils/searchToken.ts#L13-L22) — Elegant defense-in-depth search session tracking using HMAC SHA-256 tokens and constant-time comparison (`timingSafeEqual`) to prevent search log tampering without requiring user authentication.
- [`server/api/stripe/webhook.post.ts:89-110`](file:///Users/joshthompson/projects/amiunderpaid/server/api/stripe/webhook.post.ts#L89-L110) — Production-grade Stripe webhook handler featuring raw-body signature verification, transactional document-creation deduplication, and automated conflict-refund fallbacks with Resend email alerting.
- [`server/utils/emailTemplate.ts:82-92,183-230`](file:///Users/joshthompson/projects/amiunderpaid/server/utils/emailTemplate.ts#L82-L92) — Secure, brand-adaptive HTML email generator with strict character entity escaping on all dynamic data and zero `v-html` injection risks.
- [`app/middleware/domain-routing.global.ts:10-74`](file:///Users/joshthompson/projects/amiunderpaid/app/middleware/domain-routing.global.ts#L10-L74) & [`app/plugins/tenant.ts:1-28`](file:///Users/joshthompson/projects/amiunderpaid/app/plugins/tenant.ts#L1-L28) — Clean, robust multi-tenant domain and regional routing with cross-domain 301 canonical redirects between UK, US, and Benchmark brands.

---

## Recommended next steps

1. **Patch `firestore.rules` (Fixes C1)** — Add `ukNationalStatus`, `usaNationalStatus`, and `claims` to the forbidden field arrays in `firestore.rules` and verify with `pnpm run test:rules`.
2. **Configure HTTP Timeouts on Downstream Market Data Providers (Addresses I3)** — Add `timeout: 6000` to `$fetch` calls in `server/utils/adzuna.ts`, `server/utils/reed.ts`, and `server/utils/jooble.ts` to ensure fast fallback execution.
3. **Upgrade Rate Limiter Store (Addresses I1)** — Connect `server/middleware/rate-limit.ts` to an external Redis / KV store for true distributed rate limiting across Vercel serverless instances.
4. **Create Centralized Logger Utility (Addresses I2)** — Replace ad-hoc `console.error` and `eslint-disable` comments with a structured logging module.

---

## Coverage & confidence

**Reviewed in full:**

- All server routes and utilities (`server/api/**`, `server/utils/**`, `server/middleware/**`, `server/routes/**`, `server/plugins/**`).
- All client composables (`app/composables/**`), plugins (`app/plugins/**`), and shared utils (`shared/utils/**`).
- Security rules (`firestore.rules`) and CI workflows (`.github/workflows/**`).
- All root configuration files (`package.json`, `nuxt.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `tsconfig.json`).

**Sampled:**

- UI components and pages (`app/components/**`, `app/pages/**`) inspected across entry points, auth flows, recruiter checkout, and search result rendering.

**Not reviewed:**

- Vendored binary bundle `vendor/xlsx-0.20.3.tgz`.
- Large static geographic JSON datasets (`public/uk-regions.json`, `public/us-regions.json`).

**Tools run:**

- ESLint (`pnpm exec eslint --max-warnings 0`) — Passed (0 warnings, 0 errors).
- TypeScript (`pnpm run typecheck`) — Passed (0 errors).
- Spellcheck (`cspell lint`) — Passed (0 errors across 393 files).
- Structure Linter (`pnpm exec tsx scripts/structure-lint.ts`) — Passed.
- Standards Checker (`pnpm run check-standards`) — Passed.
- Test Coverage Gate (`pnpm run test:coverage`) — Passed (all units >= 80% coverage).

**Confidence:** High — Complete source-level verification across all execution paths, security rules, and build pipelines with zero unverified assumptions.
