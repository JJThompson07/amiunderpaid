## Context

See `proposal.md` for user experience rationale and motivation.

In the preceding change (`affiliate-click-tracking`, #163), telemetry infrastructure and centralized registries were established:

- Destination URLs already come from the central `shared/utils/affiliates.ts` registry.
- `trackAffiliateClick`, `trackAffiliateImpression`, and `trackAffiliateDismiss` were introduced in `useAnalytics.ts` with the `'toast'` placement.
- `shared/utils/verdict.ts` introduced `SalaryVerdict` (`'underpaid'`, `'fair'`, `'overpaid'`, `'unknown'`) and `calculateSalaryVerdict(userSalary, meanSalary || marketAverage)`.
- `app/composables/useAffiliateImpression.ts` was created for per-card viewport impression tracking once per page view.

However, the affiliate cards in `Section/Negotiation.vue` remain statically ordered, using a legacy binary comparison `isUnderpaid` (`marketAverage > currentSalary`). On UK desktop (`isXl`), a duplicate standalone CV-Library card remains hardcoded in `pages/salary/[title]/[country]/[[location]].vue` (~lines 203-236), while US users still see PurpleCV.

In the toast system:

- `ToastGeneric.vue` currently hardcodes `z-[100]` in its container classes, which silently ignores `Notification.vue`'s `z-index-class="z-[200]"`.
- Both `ToastGeneric.vue` and `ToastNotification.vue` contain hardcoded `sr-only` `"Close"` strings.
- System toasts run through `useSystemToast` (single-slot global state with an automatic 5-second close timer).

## Goals / Non-Goals

**Goals:**

- Expand `shared/utils/affiliates.ts` with a clean, server-importable offer registry and verdict ordering functions.
- Model copy keys per `(partner, verdict)` so headlines and descriptions reflect the exact salary verdict, ensuring all (country, verdict) pairings resolve to valid translation keys.
- Dynamically order the negotiation grid based on the four-way salary verdict (lead offer first).
- Adjust grid layout to `md:grid-cols-2` for US (2 cards) and `md:grid-cols-2 lg:grid-cols-4` for UK (4 cards), removing `xl:grid-cols-3` orphan and `isXl` filtering plumbing.
- Switch the negotiation email script from binary `isUnderpaid` to `verdict === 'underpaid'`.
- Remove the standalone CV-Library card slot and duplicate markup on the salary results page.
- Add `zIndexClass` prop to `ToastGeneric.vue` (default `z-[100]`), allowing `Notification.vue`'s `z-[200]` to take effect and the offer toast to use `z-[90]`.
- Replace hardcoded `sr-only` `"Close"` strings with `$t('common.close')`.
- Create a dedicated affiliate offer toast (`Toast/AffiliateOffer.vue`) and timing/eligibility composable (`useAffiliateOfferToast.ts`).
- Enforce strict display timing: 7-second delay after results complete, requiring benchmark data (`hasGovernmentData || hasJobsData`).
- If a system toast is open when the delay expires, wait until it closes, then display the affiliate offer toast immediately.
- Preserve once-per-page-view impression firing in `useAffiliateImpression` (#163) while adding a separate page-scoped seen-set for toast suppression.
- Cap toast frequency to at most once per browser session, recording suppression immediately when the toast is **SHOWN**; use a session-lived (`useState`) fallback if `sessionStorage` throws.
- Migrate existing comparison cards (`Section/Government/Comparison.vue`, `Section/Adzuna/Comparison.vue`) to `verdictToComparison`.
- Maintain >= 80% per-file test coverage across all new composables, utilities, and components.

**Non-Goals:**

- Adding new affiliate partners (e.g. US resume partners) in this change.
- Displaying affiliate offer toasts on benchmark results pages (`/benchmark/...`).
- Displaying a recruiter-promotional toast when recruiters match the search (recruiter lead promotions via toast may be explored as a distinct future change).

## Decisions

### 1. Clean, Server-Importable Registry (`shared/utils/affiliates.ts`)

To preserve clean separation of concerns and ensure `shared/utils/affiliates.ts` remains 100% server-importable without pulling in client UI dependencies:

- `shared/utils/affiliates.ts` contains ONLY data primitives, URLs, country codes, verdict priorities, and translation key tokens.
- **Tailwind theme classes and Lucide icons MUST NOT be placed in `shared/utils/affiliates.ts`.** They remain exclusively in client Vue components (`Section/Negotiation.vue` and `Toast/AffiliateOffer.vue`), mapped locally by partner slug.

Offer configuration interface:

```typescript
export interface AffiliateOfferConfig {
  slug: AffiliatePartnerSlug;
  titleKey: string;
  straplineKey: string;
  bodyHtmlKey: string;
  ctaTextKey: string;
  toastTitleKey: string;
  toastMessageKey: string;
  url: string;
  countries: string[];
  premier?: boolean;
  sponsored?: boolean;
}
```

### 2. Copy Matrix per `(partner, verdict)`

Headlines and messages vary by both partner and verdict so that every valid (country, verdict) search resolves to complete localization keys in `i18n/locales/{en-GB,en-US}/toast.json`:

- **Salary Negotiator + `'underpaid'`:** Emphasizes closing the pay gap and negotiating fair market compensation.
- **Salary Negotiator + `'fair'`:** Emphasizes performance reviews, merit increases, and annual bonus negotiation.
- **Salary Negotiator + `'overpaid'`:** Emphasizes executive compensation, equity, and total package negotiation.
- **Salary Negotiator + `'unknown'`:** Emphasizes discovering your market worth and salary negotiation strategies.
- **PurpleCV + `'fair'`:** Emphasizes professional CV review and interview readiness.
- **PurpleCV + `'overpaid'`:** Emphasizes executive positioning, leadership storytelling, and next-level career progression.

In the negotiation grid, standard body copy is retained across verdicts, avoiding template clutter while focusing verdict messaging directly on the toast.

### 3. Country Targeting & Recruiter Exclusivity

- **USA Users:** Confirmed by product decision: PurpleCV and CV-Library are excluded for US users. The US negotiation grid displays only Salary Negotiator alongside the free custom email script card.
- **Recruiter Gating:** Confirmed by product decision: When recruiters cover the search (`hasRecruiters === true`), the affiliate offer toast is completely suppressed to protect high-margin recruiter exclusivity. (Recruiter lead promotions via toast are deferred to a separate follow-up change).

### 4. Grid Layout Modernization & Code Cleanup (`Negotiation.vue`)

- **Card counts:**
  - US: 1 affiliate card (Salary Negotiator) + 1 email script card = 2 cards total.
  - UK: 3 affiliate cards (Salary Negotiator, PurpleCV, CV-Library) + 1 email script card = 4 cards total.
- **Grid classes:** Update container to `country === 'USA' ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'`. This eliminates the orphan card caused by `xl:grid-cols-3` with 4 cards.
- **Remove `isXl` plumbing:** Remove `const { isXl: viewportIsXl } = useViewport()`, `isMounted`, and `const isXl = computed(...)` from `Negotiation.vue`. They existed solely to filter CV-Library out on UK XL desktop to avoid duplicating the standalone card.
- **Email script copy:** Switch `isUnderpaid` to `verdict === 'underpaid'`. Users in the ±2.5% band are treated as fairly paid, receiving the incentive review script rather than the underpaid script.

### 5. Toast Z-Index & Accessibility Architecture (`ToastGeneric.vue`, `Notification.vue`)

- Add `zIndexClass: { type: String, default: 'z-[100]' }` to `ToastGeneric.vue` props.
- In `ToastGeneric.vue`, replace hardcoded `z-[100]` with `props.zIndexClass`. This immediately enables `Notification.vue`'s existing `z-index-class="z-[200]"` to work as intended, and allows `ToastAffiliateOffer.vue` to set `z-index-class="z-[90]"`.
- Replace hardcoded `<span class="sr-only">Close</span>` in both components with `{{ $t('common.close') }}`.

### 6. Impression Tracking State Architecture (`useAffiliateImpression.ts`)

To prevent regressing #163 (where grid impressions MUST fire once per page view):

- Keep the internal `fired = new Set<string>()` inside `useAffiliateImpression` per-instance so subsequent searches within the same session re-fire impressions when cards enter the viewport.
- Maintain a separate page-scoped seen-set for the toast (e.g. `const pageSeenGridAffiliates = useState<Set<string>>('page-seen-grid-affiliates', () => new Set())`), cleared when the results page mounts or route parameters change.
- Expose `hasImpressionFired(partner: AffiliatePartnerSlug, placement: AffiliatePlacement): boolean` checking this page-scoped set.
- `useAffiliateOfferToast` checks `hasImpressionFired(leadOffer.slug, 'negotiation-grid')` before triggering.

### 7. Toast Eligibility, Timing & System Toast Coexistence (`useAffiliateOfferToast.ts`)

Encapsulates timing and gating:

- **Delay:** 7 seconds (`AFFILIATE_TOAST_DELAY_MS = 7000`) starting once results are fully settled (`!pending && !adzunaLoading && !resolving && !showUserSelection`).
- **Data Gating:** Suppressed if `!hasGovernmentData && !hasJobsData` (the no-data state).
- **Recruiter Gating:** Suppressed if `hasRecruiters === true`.
- **Cookie Banner Gating:** Suppressed while `analyticsConsent === null` (cookie banner visible).
- **System Toast Coexistence:** If a system toast is open at the 7s mark, wait until it closes (auto-closes in 5s or dismissed), then display the affiliate offer toast immediately.
- **Grid Impression Check:** Suppressed if `hasImpressionFired(leadOffer.slug, 'negotiation-grid') === true`.
- **Session Frequency Capping:** Stored in `sessionStorage.setItem('affiliate_toast_suppressed', 'true')` **immediately when the toast is SHOWN**. If `sessionStorage` throws, falls back to a session-lived reactive flag (`useState('affiliate-toast-suppressed', () => false)`), ensuring suppression persists across searches during that session.
- **Telemetry:** Dispatches `trackAffiliateImpression` on show, `trackAffiliateClick` on CTA click, and `trackAffiliateDismiss` on close.
- **Unmount Cleanup:** Clears active timeout in `onBeforeUnmount` and on route change.

### 8. Comparison Cards Alignment (`shared/utils/verdict.ts`)

Add helper to `shared/utils/verdict.ts`:

```typescript
export const verdictToComparison = (verdict: SalaryVerdict): number => {
  if (verdict === 'overpaid') return 1;
  if (verdict === 'underpaid') return -1;
  return 0;
};
```

In `Section/Government/Comparison.vue` and `Section/Adzuna/Comparison.vue`:

```typescript
const comparison = computed<number>(() => verdictToComparison(getSalaryVerdict(diffPercent.value)));
```

### 9. Playwright E2E Testing Strategy

In `e2e/affiliate-toast.spec.ts`:

- **Client-Side Navigation Only:** Never `page.goto()` a salary results URL directly, as SSR-fetched data bypasses Playwright's `page.route()` interception (violating `CODE_STANDARDS.md` §10). Use client-side navigation (`searchFromLandingPage` / router push from hydrated page).
- **Correct Query Param:** Use `compare` (e.g. `/salary/software-engineer/gb?compare=35000`).
- **Clock Fast-Forward:**
  ```typescript
  await page.clock.install();
  await searchFromLandingPage(page, 'Software Engineer', '35000');
  await page.getByRole('button', { name: /accept/i }).click(); // resolve cookie banner
  await page.clock.fastForward(7000); // fast-forward the 7s delay
  await expect(page.getByRole('status')).toBeVisible();
  ```
- **Session Suppression Verification:** Close the toast via the (X) button, perform a second client-side search in the same browser session, fast-forward 7s, and assert the toast does not reappear.

## Risks / Trade-offs

- **[Risk] SSR bypass in e2e tests**
  → _Mitigation:_ Explicitly mandate client-side navigation from hydrated landing pages in `e2e/affiliate-toast.spec.ts` so all route intercepts function deterministically.
- **[Risk] Session storage failure in private browsing**
  → _Mitigation:_ Fallback uses `useState('affiliate-toast-suppressed')` at app session level, guaranteeing single-toast behavior per session even without storage.
- **[Risk] Reactive cookie consent synchronization**
  → _Mitigation:_ `useAffiliateOfferToast` consumes `const { analyticsConsent } = useAnalytics()`, sharing the exact same reactive ref as `CookieBanner.vue`.
