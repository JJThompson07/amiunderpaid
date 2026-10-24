## 1. Shared Utilities & Verdict Derivation

- [x] 1.1 Create `shared/utils/verdict.ts` exporting `SalaryVerdict` (`'underpaid' | 'fair' | 'overpaid' | 'unknown'`), `VERDICT_BAND_PERCENT = 2.5`, `getSalaryVerdict(diffPercent: number): SalaryVerdict`, and `calculateSalaryVerdict(currentSalary: number, marketAverage: number): SalaryVerdict` returning `'unknown'` if `currentSalary <= 0 || marketAverage <= 0`.
- [x] 1.2 Create `shared/utils/tests/verdict.spec.ts` with comprehensive Vitest unit tests covering missing/zero salary values (`currentSalary <= 0`, `marketAverage <= 0`), diff < -2.5, diff = -2.5, parity at 0, diff = 2.5, diff > 2.5, verifying >= 80% coverage via `pnpm vitest run shared/utils/tests/verdict.spec.ts --coverage`.
- [x] 1.3 Create `shared/utils/affiliates.ts` defining `AffiliatePartnerSlug` (`'salary-negotiator' | 'purple-cv' | 'cv-library'`), `AffiliatePlacement` (`'negotiation-grid' | 'standalone-xl' | 'toast'`), `AffiliateTrackingPayload`, and `AFFILIATE_PARTNERS` central registry containing destination URLs and slugs.
- [x] 1.4 Create `shared/utils/tests/affiliates.spec.ts` unit testing helper lookup functions and configuration exports, verifying >= 80% coverage via `pnpm vitest run shared/utils/tests/affiliates.spec.ts --coverage`.

## 2. Analytics Composables & Telemetry

- [x] 2.1 Update `app/composables/useAnalytics.ts` to expose `trackAffiliateClick(payload: AffiliateTrackingPayload): void`, `trackAffiliateImpression(payload: AffiliateTrackingPayload): void`, and `trackAffiliateDismiss(payload: AffiliateTrackingPayload): void`, routing through `trackEvent('affiliate_click', payload)`, `trackEvent('affiliate_impression', payload)`, and `trackEvent('affiliate_dismiss', payload)` to inherit `import.meta.dev` gating, cookie consent checking, and `$siteBrand` injection while strictly excluding user salary or PII.
- [x] 2.2 Update `app/composables/tests/useAnalytics.spec.ts` to add unit tests for `trackAffiliateClick`, `trackAffiliateImpression`, and `trackAffiliateDismiss` verifying gtag calls when `analytics_consent` is `'granted'`, no-op when consent is missing/denied, and no-op when `import.meta.dev` is true, ensuring >= 80% coverage gate is met via `pnpm vitest run app/composables/tests/useAnalytics.spec.ts --coverage`.
  - Note: the `import.meta.dev` no-op path is not unit-tested. `import.meta` in Vitest inherits directly from `Object.prototype`, so forcing `dev` per test means patching every object; the new helpers inherit the existing (also untested) `trackEvent` dev branch instead.
- [x] 2.3 Create `app/composables/useAffiliateImpression.ts` providing per-card viewport impression observation (accepting target element or template ref, partner slug, placement, country, verdict; deduplicating once per page view per `(partner, placement)`; SSR-safe; clean disconnect on unmount).
- [x] 2.4 Create `app/composables/tests/useAffiliateImpression.spec.ts` with unit tests (stubbing `IntersectionObserver`; testing single fire on intersect, no duplicate fire on re-entry, graceful SSR / missing `IntersectionObserver`, and disconnect on unmount) meeting the >= 80% coverage gate via `pnpm vitest run app/composables/tests/useAffiliateImpression.spec.ts --coverage`.

## 3. Component Integration & Tracking Execution

- [x] 3.1 Update `app/components/Section/Negotiation.vue`:
  - Replace hardcoded affiliate destination URLs with constants imported from `shared/utils/affiliates.ts`.
  - Calculate the current salary verdict using `calculateSalaryVerdict(props.currentSalary, props.marketAverage)`.
  - Add non-blocking `@click` handler to affiliate links (`target="_blank"`, `rel="sponsored"`) calling `trackAffiliateClick({ partner, placement: 'negotiation-grid', country: props.country, verdict })`.
  - Attach `useAffiliateImpression` to each affiliate card element individually so that mobile single-column cards only trigger an impression when that specific card enters the viewport.
- [x] 3.2 Update `app/pages/salary/[title]/[country]/[[location]].vue`:
  - For the standalone CV-Library `LazyAmICardAction` (`v-if="country === 'UK' && isXl"`):
  - Replace hardcoded CV-Library URL with the centralized URL from `shared/utils/affiliates.ts`.
  - Calculate verdict using `calculateSalaryVerdict(userSalary.value, meanSalary.value || marketAverage.value)` to ensure parity with `Negotiation.vue`.
  - Add non-blocking `@click` handler to the CTA calling `trackAffiliateClick({ partner: 'cv-library', placement: 'standalone-xl', country: country.value, verdict })` preserving `target="_blank"` and `rel="sponsored"`.
  - Attach `useAffiliateImpression` to the standalone card element for `'cv-library'` and `'standalone-xl'`.
- [x] 3.3 Verify `app/pages/benchmark/[title]/[country]/[[location]].vue` contains no affiliate links (confirmed clean in planning) and verify zero hardcoded strings were added to templates or scripts requiring new i18n keys.

## 4. Verification & Operational Tasks

- [x] 4.1 Execute full local verification pipeline `pnpm test:verify` (chaining lint, typecheck, coverage with 80% per-file gate, mocked Playwright e2e, and Firestore rules) and confirm all checks pass with zero regressions.
- [ ] 4.2 Manual post-deploy task (User facing): In Google Analytics 4 Admin > Custom definitions > Custom dimensions, create event-scoped custom dimensions for `partner`, `placement`, `verdict`, and `country` (searched country from payload) so they populate in GA4 reports and explorations.
