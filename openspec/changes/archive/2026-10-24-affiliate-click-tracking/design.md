## Context

See `proposal.md` for the business motivation and high-level requirements.

Currently, `app/composables/useAnalytics.ts` provides centralized event dispatching to Google Analytics (`gtag`) wrapped with:

- Development gating via `import.meta.dev` (early return to prevent polluting production metrics during local dev).
- User privacy consent gating via `useCookie('analytics_consent') === 'granted'`.
- Brand telemetry via `$siteBrand`.

Affiliate links exist exclusively on the salary results page (`app/pages/salary/[title]/[country]/[[location]].vue` and its child component `app/components/Section/Negotiation.vue`) inside `v-if="!hasRecruiters"`. There are currently no affiliate links on the benchmark results page (`app/pages/benchmark/[title]/[country]/[[location]].vue`).

On the salary results page, the benchmark baseline is passed to `Negotiation.vue` as `meanSalary || marketAverage` (line 242). Previously, `Section/Government/Comparison.vue` and `Section/Adzuna/Comparison.vue` duplicated a ±2.5% band calculation, while `Negotiation.vue` used a binary `marketAverage > currentSalary` comparison for email script copy.

## Goals / Non-Goals

**Goals:**

- Extend `useAnalytics` with `trackAffiliateClick`, `trackAffiliateImpression`, and `trackAffiliateDismiss` routed through `trackEvent`.
- Centralize partner slugs, URLs, and placement identifiers (`negotiation-grid`, `standalone-xl`, `toast`) in `shared/utils/affiliates.ts`.
- Introduce a single-source salary verdict derivation in `shared/utils/verdict.ts` supporting four states (`'underpaid'`, `'fair'`, `'overpaid'`, `'unknown'`).
- Ensure all affiliate placements on the salary page evaluate verdict against the identical baseline (`calculateSalaryVerdict(userSalary, meanSalary || marketAverage)`).
- Fire click events non-blockingly on every affiliate CTA click while maintaining `target="_blank"` and `rel="sponsored"`.
- Fire impression events at most once per page view per partner and placement via a dedicated composable (`useAffiliateImpression.ts`) observing each card individually.
- Strictly guarantee zero salary figures or PII are passed in analytics payloads.
- Maintain 80% minimum per-file test coverage for all new and updated composables and utilities.

**Non-Goals:**

- Changing which offers are displayed, reordering cards, or altering CTA copy/styling.
- Refactoring existing comparison cards (`Section/Government/Comparison.vue`, `Section/Adzuna/Comparison.vue`) to use the new verdict helper in this change; that migration will occur in `verdict-relevant-affiliate-offers`.
- Adding affiliate links to benchmark pages or introducing UI for the `'toast'` placement (toast UI is introduced in the follow-up change).
- Making live network calls in e2e tests (Playwright continues using mocked endpoints).

## Decisions

### 1. Centralized Affiliate Registry (`shared/utils/affiliates.ts`)

We establish a single source of truth in `shared/utils/affiliates.ts` containing:

- Partner slugs (`AffiliatePartnerSlug`): `'salary-negotiator' | 'purple-cv' | 'cv-library'`.
- Placements (`AffiliatePlacement`): `'negotiation-grid' | 'standalone-xl' | 'toast'` (the `'toast'` placement is declared now so the follow-up change reuses it seamlessly).
- Payload type (`AffiliateTrackingPayload`): `{ partner: AffiliatePartnerSlug; placement: AffiliatePlacement; country: string; verdict: SalaryVerdict }`.
- Static partner definitions mapping slugs to base URLs and locale-independent identifiers.

_Alternatives considered:_ Keeping URLs and slugs hardcoded across `Negotiation.vue` and `[location].vue`. Rejected because the follow-up change needs programmatic offer selection, and duplicate URLs create drift risk.

### 2. Single-Source Salary Verdict Helper (`shared/utils/verdict.ts`)

We encapsulate the verdict logic in `shared/utils/verdict.ts`:

- If `currentSalary <= 0` or `marketAverage <= 0`: return `'unknown'` (handles cases where salary input or market target data is missing or invalid, avoiding false `'fair'` bucketing from 0% diff).
- If `diffPercent < -2.5`: return `'underpaid'`.
- If `diffPercent > 2.5`: return `'overpaid'`.
- Otherwise: return `'fair'`.
- Expose `getSalaryVerdict(diffPercent: number): SalaryVerdict` and `calculateSalaryVerdict(currentSalary: number, marketAverage: number): SalaryVerdict`.
- Every placement on the salary results page mandates `calculateSalaryVerdict(userSalary, meanSalary || marketAverage)` so that the negotiation grid and standalone card always report identical verdicts.
- _Migration scope note:_ This helper is introduced in this change for affiliate tracking; existing comparison components (`Section/Government/Comparison.vue`, `Section/Adzuna/Comparison.vue`) will migrate to it in the follow-up change (`verdict-relevant-affiliate-offers`).

### 3. Dedicated Per-Card Impression Composable (`app/composables/useAffiliateImpression.ts`)

Instead of observing the parent grid element or duplicating observer logic inline across components:

- We extract the observer lifecycle into `useAffiliateImpression()`.
- Each card element registers its own target element ref, partner slug, placement, country, and verdict.
- Why per-card instead of per-grid? On mobile devices, cards stack vertically in a single column. Observing the grid would fire impressions for all partners simultaneously even if lower cards remain off-screen. Observing individual cards ensures an impression is only emitted when that specific partner card enters the viewport.
- Deduplication: Maintains an in-memory `Set<string>` of fired keys (format: `${partner}:${placement}`) per page lifecycle to prevent re-firing when scrolling in and out.
- SSR Safety: Guards observer initialization with `typeof window !== 'undefined' && 'IntersectionObserver' in window`.
- Cleanup: Automatically disconnects the element from the observer when the component unmounts (`onBeforeUnmount`).

### 4. Non-Blocking Click & Dismissal Handling

- Anchor tags retain `target="_blank"` and `rel="sponsored"`.
- We attach `@click="trackAffiliateClick({ partner, placement, country, verdict })"`.
- Dismissal handler: `trackAffiliateDismiss({ partner, placement, country, verdict })` is available for dismissible offers (such as toasts in the follow-up change).
- Because `gtag` enqueues calls into `dataLayer` synchronously in memory, navigation is never paused or prevented, preventing pop-up blocker triggers.

### 5. Dev-Mode & Privacy Safeguards

- All tracking calls (`affiliate_click`, `affiliate_impression`, `affiliate_dismiss`) route through `trackEvent(eventName, payload)`.
- Automatically inherits `import.meta.dev` no-op check and `analytics_consent === 'granted'` check.
- Payload parameters are restricted strictly to `partner`, `placement`, `country`, `verdict`, and `brand`.

## Risks / Trade-offs

- **[Risk] Test environment lacks IntersectionObserver**
  → _Mitigation:_ Vitest `happy-dom` lacks a native `IntersectionObserver`. In `app/composables/tests/useAffiliateImpression.spec.ts`, stub `global.IntersectionObserver` using `vi.fn()` to test callback triggers, duplicate prevention, and cleanup.
- **[Risk] Multiple impression firings on scroll oscillations or layout shifts**
  → _Mitigation:_ Disconnect or unobserve each card element immediately after its first intersection trigger, backed by the deduplication Set.
- **[Risk] GA4 drops event parameters without custom dimensions**
  → _Mitigation:_ Include an explicit post-deploy manual configuration task for GA Admin custom dimension setup (`partner`, `placement`, `verdict`, and `country`).
- **[Risk] 80% Vitest coverage requirement for new composables and utilities**
  → _Mitigation:_ Write comprehensive unit tests in `shared/utils/tests/affiliates.spec.ts`, `shared/utils/tests/verdict.spec.ts`, `app/composables/tests/useAnalytics.spec.ts`, and `app/composables/tests/useAffiliateImpression.spec.ts`.

## Migration / Operational Plan

1. Code deployment does not alter database schemas or external endpoints.
2. User manual post-deploy step: Register `partner`, `placement`, `verdict`, and `country` as event-scoped custom dimensions in GA4 Admin.
