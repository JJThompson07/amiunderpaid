## Why

Affiliate partner links on the salary results page are an active revenue source, but currently have zero analytics tracking. Product and growth teams cannot distinguish whether low affiliate revenue stems from poor visibility (users never scroll or reach the affiliate sections) or low click-through intent (users see the cards but choose not to engage).

To measure performance and establish an empirical baseline before deploying the follow-up change (`verdict-relevant-affiliate-offers`), we must track impressions (when individual affiliate cards enter the viewport), clicks across all affiliate CTAs, and offer dismissals (supporting future delayed toast prompts). Every event must capture stable partner slugs, placement identifiers, user country context, and the four-way salary verdict ('underpaid' | 'fair' | 'overpaid' | 'unknown') without leaking sensitive user salary figures or PII.

## What Changes

- **Analytics Composable Enhancements (`app/composables/useAnalytics.ts`)**:
  - Add `trackAffiliateClick(payload: AffiliateTrackingPayload): void`, `trackAffiliateImpression(payload: AffiliateTrackingPayload): void`, and `trackAffiliateDismiss(payload: AffiliateTrackingPayload): void` to `useAnalytics`.
  - Route all three helpers through internal `trackEvent` to automatically inherit dev-mode gating (`import.meta.dev` no-op), cookie consent gating (`analytics_consent === 'granted'`), and brand injection (`$siteBrand`).
  - Enforce payload contract: `partner` (stable partner slug: `salary-negotiator`, `purple-cv`, `cv-library` — NOT translated display strings), `placement` (`negotiation-grid`, `standalone-xl`, `toast`), `country` (searched country, e.g. `UK`, `USA`), and `verdict` (`'underpaid' | 'fair' | 'overpaid' | 'unknown'`).
  - Strict privacy rule: Do not pass salary amounts, currencies, search tokens, or any user PII in event payloads.
- **Centralized Affiliate Partners & Single-Source Salary Verdict (`shared/utils/`)**:
  - Add `shared/utils/affiliates.ts` defining partner slugs (`salary-negotiator`, `purple-cv`, `cv-library`), placement constants (`negotiation-grid`, `standalone-xl`, `toast`), affiliate destination URLs, and TypeScript interfaces (`AffiliatePartnerSlug`, `AffiliatePlacement`, `AffiliateTrackingPayload`) so the follow-up change reuses identical definitions.
  - Add `shared/utils/verdict.ts` introducing a single-source salary verdict calculation based on the ±2.5% diff band (`'underpaid'` when diff < -2.5%, `'overpaid'` when diff > 2.5%, `'fair'` within [-2.5%, 2.5%], and `'unknown'` if user salary or market average is <= 0).
  - Mandate consistent verdict evaluation across all placements on the salary page using `calculateSalaryVerdict(userSalary, meanSalary || marketAverage)` so the grid and standalone card always report identical verdicts.
- **Affiliate Link Click Tracking**:
  - Attach non-blocking click listeners to affiliate CTAs in `app/components/Section/Negotiation.vue` and `app/pages/salary/[title]/[country]/[[location]].vue`.
  - Maintain `target="_blank"` and `rel="sponsored"` attributes without delaying external navigation.
- **Individual Card Viewport Impression Tracking Composable (`app/composables/useAffiliateImpression.ts`)**:
  - Extract the `IntersectionObserver` impression logic into a shared composable (`app/composables/useAffiliateImpression.ts`) consumed by `Negotiation.vue`, the salary results page, and future affiliate UI (such as toasts).
  - Observe each affiliate card element individually rather than observing the parent grid, ensuring lower cards that remain off-screen on single-column mobile viewports do not fire impressions prematurely.
  - Guarantee impressions fire at most once per page view per `(partner, placement)` combination, avoiding duplicate events on repeated scrolling, with safe cleanup on unmount.
- **Verified Scope & Non-Goals**:
  - Verified `app/pages/benchmark/[title]/[country]/[[location]].vue`: confirmed zero affiliate links exist on benchmark pages today; scope remains strictly on salary results.
  - Non-goal: Changing which partner offers are rendered, altering card order, modifying styling, or migrating existing comparison components (`Section/Government/Comparison.vue`, `Section/Adzuna/Comparison.vue`) to the new verdict helper (deferred to `verdict-relevant-affiliate-offers`).

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `analytics-tracking`: Add requirements for affiliate click tracking, per-card viewport-based impression tracking (deduplicated per page view per partner and placement), offer dismissal tracking, privacy guarantees (zero PII/salary in payloads), and standardized partner/verdict metadata.

## Impact

- `app/composables/useAnalytics.ts`: Exposes `trackAffiliateClick`, `trackAffiliateImpression`, and `trackAffiliateDismiss`.
- `app/composables/tests/useAnalytics.spec.ts`: Unit tests covering consented tracking, consent rejection, and dev-mode no-op execution for click, impression, and dismiss (80% per-file coverage gate).
- `app/composables/useAffiliateImpression.ts`: Reusable composable for per-card viewport impression tracking using native `IntersectionObserver`.
- `app/composables/tests/useAffiliateImpression.spec.ts`: Unit tests verifying one-time firing, duplicate suppression, SSR / missing observer safety, and cleanup on unmount.
- `shared/utils/affiliates.ts`: Central registry for affiliate partner metadata, URLs, placement types (`negotiation-grid`, `standalone-xl`, `toast`), and types.
- `shared/utils/tests/affiliates.spec.ts`: Unit tests for affiliate helper functions and constants.
- `shared/utils/verdict.ts`: Shared utility for four-way salary verdict derivation (`'underpaid'`, `'fair'`, `'overpaid'`, `'unknown'`).
- `shared/utils/tests/verdict.spec.ts`: Unit tests for salary verdict calculation across positive, negative, zero, and missing salary edge cases.
- `app/components/Section/Negotiation.vue`: Replaces hardcoded affiliate URLs with centralized registry, attaches click handlers, and attaches individual card impression observers via `useAffiliateImpression`.
- `app/pages/salary/[title]/[country]/[[location]].vue`: Replaces hardcoded CV-Library link with centralized URL, aligns verdict calculation to `meanSalary || marketAverage`, attaches click handler, and tracks standalone card impression via `useAffiliateImpression`.
- GA4 Administration: Post-deploy registration of `partner`, `placement`, `verdict`, and `country` as GA4 event-scoped custom dimensions.
- Zero new external runtime dependencies; zero changes to existing mocked e2e tests or live backend APIs.
