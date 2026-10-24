## Why

Affiliate partner cards currently sit at the bottom of the salary results page below the KPI summary, MCA score, comparison visualizers, and jobs carousel. Analytics and partner dashboards show that Salary Negotiator and PurpleCV generate almost all engagement, while CV-Library drives negligible traffic despite occupying a dedicated standalone slot on UK desktop. Most users bounce before scrolling to the bottom of the page, meaning the majority of visitors never see an affiliate offer.

Surfacing the single most relevant offer tailored to each user's salary verdict via an unobtrusive, timed toast prompt will dramatically improve affiliate discovery without disrupting the core salary benchmarking experience. In tandem, restructuring the negotiation grid to order cards by verdict relevance (lead offer first) and filtering out irrelevant country offers (e.g. hiding UK-only CV services from US users) ensures users who do scroll down see an aligned set of resources.

## What Changes

- **Clean, Server-Importable Offer Registry (`shared/utils/affiliates.ts`)**:
  - Centralize partner data in `shared/utils/affiliates.ts` containing strictly primitives and keys (slug, URL, supported countries, verdict priorities, copy key tokens).
  - Explicitly keep presentation details (Tailwind theme classes, Lucide icons) inside Vue components (`Section/Negotiation.vue` and `Toast/AffiliateOffer.vue`), mapped locally by partner slug.
  - Define comprehensive copy keys per `(partner, verdict)` tuple:
    - `salary-negotiator.{underpaid, fair, overpaid, unknown}`: ensures all 4 verdicts for Salary Negotiator resolve cleanly in both UK and US contexts.
    - `purple-cv.{fair, overpaid}`: standard CV review for fair compensation and executive positioning for overpaid roles.
  - Provide `getOrderedAffiliateOffers(country: string, verdict: SalaryVerdict)` and `getLeadAffiliateOffer(country: string, verdict: SalaryVerdict)`.
  - Exclude PurpleCV and CV-Library for US users so the US grid displays only Salary Negotiator alongside the custom email script.
- **Negotiation Grid Modernization & Responsive Layout (`app/components/Section/Negotiation.vue`)**:
  - Dynamically order grid cards using `getOrderedAffiliateOffers` based on the shared four-way salary verdict.
  - Adjust grid column classes to prevent orphans: `md:grid-cols-2` for US (2 cards: 1 affiliate + 1 email script) and `md:grid-cols-2 lg:grid-cols-4` for UK (4 cards: 3 affiliate + 1 email script), removing the former `xl:grid-cols-3` cap.
  - Remove all legacy `isXl`, `viewportIsXl`, and `isMounted` filtering plumbing from `Negotiation.vue`.
  - Switch the email script condition from binary `isUnderpaid` (`marketAverage > currentSalary`) to `verdict === 'underpaid'`, explicitly adopting the parity band (users within ±2.5% receive the incentive review template).
- **Removal of Standalone CV-Library Slot (`app/pages/salary/[title]/[country]/[[location]].vue`)**:
  - Remove the standalone `LazyAmICardAction` block and duplicate CV-Library markup (~lines 203-236).
  - Retain CV-Library strictly as a low-priority option in the UK negotiation grid.
- **Toast Generic Z-Index Prop & Close Label Accessibility (`app/components/Toast/Generic.vue`, `Notification.vue`)**:
  - Add a `zIndexClass` prop to `ToastGeneric.vue` (defaulting to `'z-[100]'`), enabling `Notification.vue`'s existing `z-[200]` attribute to take effect and allowing the offer toast to specify `'z-[90]'`.
  - Replace hardcoded `sr-only` `"Close"` strings in `ToastGeneric.vue` and `ToastNotification.vue` with `$t('common.close')`.
- **Affiliate Offer Toast Component (`app/components/Toast/AffiliateOffer.vue`)**:
  - Create a dedicated component wrapping `ToastGeneric` (`duration: 0`, `zIndexClass="z-[90]"`) independent of `useSystemToast` to prevent colliding with or auto-closing system notifications.
  - Displays partner icon, verdict-specific headline/message, external CTA link (`target="_blank"`, `rel="sponsored"`), visible "Sponsored" badge, and accessible close button (`$t('common.close')`).
  - Implements `role="status"` and `aria-live="polite"` without stealing focus; sized for mobile (`max-w-[250px] sm:max-w-sm`).
- **Page-Scoped Seen Tracking for Grid Impressions (`app/composables/useAffiliateImpression.ts`)**:
  - Keep the per-instance `fired` set intact in `useAffiliateImpression` to ensure grid impressions continue firing once per page view on subsequent searches (preserving #163 behavior).
  - Add a separate page-scoped seen set for toast coordination, cleared on page mount and route parameter changes, exposing `hasImpressionFired(partner, placement): boolean`.
- **Toast Lifecycle & Timing Composable (`app/composables/useAffiliateOfferToast.ts`)**:
  - 7-second display delay (`AFFILIATE_TOAST_DELAY_MS = 7000`) starting only once results settle and benchmark data exists (`hasGovernmentData || hasJobsData`).
  - System toast coexistence: If a system toast is open at the 7s mark, wait until it closes, then display the affiliate offer toast immediately.
  - Gating: Suppressed if recruiters cover the search (`hasRecruiters === true`), while cookie consent is unresolved (`analyticsConsent === null`), or if the lead partner card has already been viewed in the grid (`hasImpressionFired(leadOffer.slug, 'negotiation-grid')`).
  - Session Frequency Capping: Set `affiliate_toast_suppressed` in `sessionStorage` immediately when the toast is **SHOWN** (preventing reappearance on subsequent searches if ignored). If storage throws, falls back to a session-lived `useState` flag.
  - Telemetry: Dispatches `trackAffiliateImpression` on display, `trackAffiliateClick` on CTA click, and `trackAffiliateDismiss` on close.
  - Lifecycle: Pending timers automatically cancelled on component unmount and route parameter changes.
- **Comparison Cards Verdict Helper Alignment**:
  - Migrate `Section/Government/Comparison.vue` and `Section/Adzuna/Comparison.vue` to `verdictToComparison(getSalaryVerdict(diffPercent))` from `shared/utils/verdict.ts`.
- **E2E & Implementation Checks**:
  - Playwright e2e test navigating strictly via client-side transitions (e.g. `searchFromLandingPage` / router push from hydrated page) using the `compare` query parameter (`/salary/software-engineer/gb?compare=35000`) to avoid bypassing Nitro route mocks via raw `page.goto()`. Uses `page.clock` to fast-forward 7s delay after accepting cookie consent.
  - Implementation task checking reactive cookie consent synchronization between `CookieBanner` and `useAffiliateOfferToast` (reading via `useAnalytics().analyticsConsent`).

## Capabilities

### New Capabilities

- `affiliate-offers`: Defines data-driven affiliate offer presentation, verdict-based lead offer selection, country filtering, and the non-intrusive delayed affiliate toast lifecycle.

### Modified Capabilities

<!-- None -->

## Impact

- `shared/utils/affiliates.ts`: Clean data registry (no UI/Tailwind/Lucide), `(partner, verdict)` copy keys covering all 4 verdicts for Salary Negotiator and PurpleCV (`fair`, `overpaid`), and offer ordering/lead helper functions.
- `shared/utils/tests/affiliates.spec.ts`: Unit tests covering verdict × country matrix for offer selection and asserting every country × verdict combination resolves to existing translation keys.
- `shared/utils/verdict.ts` & `shared/utils/tests/verdict.spec.ts`: Exports and tests `verdictToComparison`.
- `i18n/locales/en-GB/toast.json` & `i18n/locales/en-US/toast.json`: Concrete toast copy keyed per `(partner, verdict)`.
- `app/components/Toast/Generic.vue`: Adds `zIndexClass` prop; uses `$t('common.close')`.
- `app/components/Toast/Notification.vue`: Uses `$t('common.close')`.
- `app/components/Toast/AffiliateOffer.vue`: New toast UI component.
- `app/components/Toast/tests/AffiliateOffer.spec.ts`: Component unit test.
- `app/composables/useAffiliateImpression.ts` & `app/composables/tests/useAffiliateImpression.spec.ts`: Extended with separate page-scoped seen state and `hasImpressionFired`.
- `app/composables/useAffiliateOfferToast.ts` & `app/composables/tests/useAffiliateOfferToast.spec.ts`: New toast timing and gating composable with fake-timer tests.
- `app/components/Section/Negotiation.vue`: Ordered offers, updated grid layout classes (2 cards US, 4 cards UK), removed `isXl` plumbing, email script `verdict === 'underpaid'`.
- `app/pages/salary/[title]/[country]/[[location]].vue`: Removes standalone card; mounts `ToastAffiliateOffer`.
- `app/components/Section/Government/Comparison.vue` & `app/components/Section/Adzuna/Comparison.vue`: Migrated to shared verdict helper.
- `e2e/affiliate-toast.spec.ts`: Playwright test with client-side navigation and `page.clock`.

## Non-Goals

- Adding new affiliate partners (e.g. US resume partners) in this change.
- Displaying affiliate offer toasts on benchmark results pages (`/benchmark/...`).
- Displaying a recruiter-promotional toast when recruiters match the search (recruiter lead promotions via toast may be explored as a distinct future change).
