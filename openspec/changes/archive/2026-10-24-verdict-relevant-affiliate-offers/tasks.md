## 1. Offer Registry & Verdict Ordering Utility

- [x] 1.1 Expand `shared/utils/affiliates.ts` with `AffiliateOfferConfig`, `getOrderedAffiliateOffers(country, verdict)`, and `getLeadAffiliateOffer(country, verdict)`:
  - Keep the registry server-importable and free of UI dependencies (no Tailwind classes or Lucide icons; only primitives, URLs, country codes, verdict priorities, and translation key tokens).
  - Model copy keys per `(partner, verdict)` tuple covering all 4 verdicts for Salary Negotiator (`underpaid`, `fair`, `overpaid`, `unknown`) and PurpleCV (`fair`, `overpaid`).
  - Filter offers by supported countries (excludes PurpleCV and CV-Library for US users).
  - Order offers with lead partner first for each verdict (Salary Negotiator for underpaid/unknown; PurpleCV for UK fair/overpaid; CV-Library low-priority in UK only).
- [x] 1.2 Update `shared/utils/tests/affiliates.spec.ts`:
  - Cover the full `country × verdict` matrix for `getOrderedAffiliateOffers` and `getLeadAffiliateOffer`.
  - Add an explicit unit test asserting every country × verdict lead offer resolves to existing keys in BOTH `i18n/locales/en-GB/toast.json` and `i18n/locales/en-US/toast.json`.
  - Assert >= 80% per-file coverage via `pnpm vitest run shared/utils/tests/affiliates.spec.ts --coverage`.
- [x] 1.3 Update `shared/utils/verdict.ts` to export `verdictToComparison(verdict: SalaryVerdict): number`, and update `shared/utils/tests/verdict.spec.ts` to test this helper with >= 80% coverage via `pnpm vitest run shared/utils/tests/verdict.spec.ts --coverage`.

## 2. Toast UI & Accessibility Modernization

- [x] 2.1 Add affiliate toast copy to `i18n/locales/en-GB/toast.json` and `i18n/locales/en-US/toast.json` keyed per `(partner, verdict)`:
  - `salary-negotiator.{underpaid, fair, overpaid, unknown}.{title, message}`
  - `purple-cv.{fair, overpaid}.{title, message}`
  - "Sponsored" badge and CTA labels.
- [x] 2.2 Update `app/components/Toast/Generic.vue` and `app/components/Toast/Notification.vue`:
  - Add `zIndexClass` prop to `ToastGeneric.vue` (defaulting to `'z-[100]'`), applying it to `containerClasses` so `Notification.vue`'s `z-[200]` takes effect.
  - Replace hardcoded `sr-only` `"Close"` strings in both components with `$t('common.close')`.
- [x] 2.3 Create `app/components/Toast/AffiliateOffer.vue` wrapping `ToastGeneric` (`duration: 0`, `zIndexClass="z-[90]"`):
  - Map partner icons and Tailwind theme classes locally by partner slug.
  - Render partner icon, sponsored badge, verdict-specific headline/message, external CTA link (`target="_blank"`, `rel="sponsored"`), and close button (`$t('common.close')`).
  - Implement `role="status"` and `aria-live="polite"` without stealing focus; constrain mobile width to `max-w-[250px] sm:max-w-sm`.
- [x] 2.4 Create `app/components/Toast/tests/AffiliateOffer.spec.ts` component test verifying rendering, attribute bindings (`target="_blank"`, `rel="sponsored"`), sponsored label, close emit, and click emit.

## 3. Impression Composable & Toast Lifecycle

- [x] 3.1 Extend `app/composables/useAffiliateImpression.ts`:
  - Keep the per-instance `fired` set intact so grid impressions re-fire once per page view on subsequent searches (preserving #163).
  - Add a separate page-scoped seen-set for the toast, cleared when the results page mounts / route parameters change, exposing `hasImpressionFired(partner: AffiliatePartnerSlug, placement: AffiliatePlacement): boolean`.
- [x] 3.2 Update `app/composables/tests/useAffiliateImpression.spec.ts`:
  - Test `hasImpressionFired` within the same page view.
  - Test that a second search/mount re-fires grid impressions as expected while the page-scoped seen state resets (>= 80% coverage via `pnpm vitest run app/composables/tests/useAffiliateImpression.spec.ts --coverage`).
- [x] 3.3 Create `app/composables/useAffiliateOfferToast.ts`:
  - Implement 7-second display delay (`AFFILIATE_TOAST_DELAY_MS = 7000`) starting once page data settles and benchmark data exists (`hasGovernmentData || hasJobsData`).
  - Gating: suppress if `hasRecruiters === true`, if cookie banner is active (`analyticsConsent === null`), or if lead card was already seen in grid (`hasImpressionFired(leadOffer.slug, 'negotiation-grid')`).
  - System toast coexistence: If a system toast is open at the 7s mark (`toastState.isOpen === true`), wait until it closes, then display the affiliate offer toast immediately.
  - Implementation check: read cookie consent via `useAnalytics().analyticsConsent` to ensure reactive synchronization with `CookieBanner.vue`.
  - Session frequency capping: record `affiliate_toast_suppressed` in `sessionStorage` immediately when the toast is **SHOWN** (preventing reappearance on subsequent searches if ignored). Fall back to a session-lived reactive flag (`useState('affiliate-toast-suppressed')`) if `sessionStorage` throws.
  - Telemetry: trigger `trackAffiliateImpression` on show, `trackAffiliateClick` on CTA click, and `trackAffiliateDismiss` on close.
  - Lifecycle: cancel active delay timer on unmount and route parameter changes.
- [x] 3.4 Create `app/composables/tests/useAffiliateOfferToast.spec.ts` using Vitest fake timers (`vi.useFakeTimers()`):
  - Test delay elapsed triggers display when benchmark data exists.
  - Test suppression when benchmark data is missing (`!hasGovernmentData && !hasJobsData`).
  - Test suppression when `hasRecruiters` is true.
  - Test suppression when cookie banner is unresolved (`analyticsConsent === null`).
  - Test waiting behavior when system toast is active (`toastState.isOpen === true`): delay elapses -> toast waits -> system toast closes -> affiliate toast displays immediately.
  - Test suppression when lead card already fired impression in negotiation grid.
  - Test session suppression marked on show, persisting across searches and falling back cleanly if storage throws.
  - Test timer cancellation on unmount.
  - Verify >= 80% coverage via `pnpm vitest run app/composables/tests/useAffiliateOfferToast.spec.ts --coverage`.

## 4. Results Page & Comparison Cards Integration

- [x] 4.1 Update `app/pages/salary/[title]/[country]/[[location]].vue`:
  - Remove the standalone `LazyAmICardAction` block and duplicate CV-Library markup (~lines 203-236).
  - Mount `ToastAffiliateOffer` wired to `useAffiliateOfferToast`, passing `hasGovernmentData || hasJobsData`.
  - Clear page-scoped affiliate seen impressions on mount / route parameter updates.
- [x] 4.2 Update `app/components/Section/Negotiation.vue`:
  - Render cards dynamically from `getOrderedAffiliateOffers(props.country, verdict)`.
  - Map Tailwind theme classes and Lucide icons locally by slug.
  - Update grid classes to `country === 'USA' ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'`, eliminating the orphan card caused by `xl:grid-cols-3`.
  - Remove legacy `isXl`, `viewportIsXl`, and `isMounted` filtering plumbing.
  - Switch email script condition from `isUnderpaid` to `verdict === 'underpaid'`, explicitly noting the ±2.5% parity band behavior.
- [x] 4.3 Migrate `app/components/Section/Government/Comparison.vue` and `app/components/Section/Adzuna/Comparison.vue`:
  - Replace duplicate inline ternary checks with `verdictToComparison(getSalaryVerdict(diffPercent))`.

## 5. Verification & E2E Testing

- [x] 5.1 Create `e2e/affiliate-toast.spec.ts` using mocked endpoints:
  - Use client-side navigation (`searchFromLandingPage` / router push from hydrated page) with the `compare` query param (`/salary/software-engineer/gb?compare=35000`) to avoid Nitro SSR bypassing route mocks.
  - Accept the cookie banner first to satisfy consent gating.
  - Use Playwright `page.clock` (`fastForward(7000)`) to fast-forward the 7-second delay.
  - Verify toast displays on salary results after delay.
  - Verify clicking close (X) dismisses the toast.
  - Navigate client-side to a second search in the same session, fast-forward 7s, and verify the toast does not re-display.
- [x] 5.2 Run full project verification suite `pnpm test:verify` (chaining lint, typecheck, vitest with per-file 80% coverage gate, Playwright e2e with mocked endpoints, and Firestore rules tests) and confirm all checks pass with zero regressions.
