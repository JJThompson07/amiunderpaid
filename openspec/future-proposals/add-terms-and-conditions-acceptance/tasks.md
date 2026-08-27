## 1. Data model and shared constant

- [ ] 1.1 In `shared/utils/types.ts`, add `termsAcceptedAt?: string | null;` and `termsAcceptedVersion?: string | null;` to `UserProfile`.
- [ ] 1.2 Create `shared/utils/terms.ts` exporting `CURRENT_TERMS_VERSION = '2026-08-20'` (or whatever date the content's `updated` field actually ends up carrying) — the single source of truth imported by both client composables and the server-side checkout guard, so they can never drift out of sync.

## 2. Composable and modal

- [ ] 2.1 Create `app/composables/useTermsAcceptance.ts` exposing `hasAcceptedCurrentTerms: ComputedRef<boolean>` (`userProfile.value?.termsAcceptedVersion === CURRENT_TERMS_VERSION`) and `acceptTerms(): Promise<void>` (calls `updateProfile({ termsAcceptedAt: new Date().toISOString(), termsAcceptedVersion: CURRENT_TERMS_VERSION })`).
- [ ] 2.2 Create `app/components/Modal/TermsAndConditions.vue`, wrapping `ModalGeneric` (same pattern as `Modal/CancelTerritory.vue`), rendering every section of `terms-and-conditions.json` via `$t()`. Takes only `v-model`.
- [ ] 2.3 Create a small reusable checkbox component (e.g. `app/components/Terms/AcceptanceCheckbox.vue`) rendering: a checkbox bound to a `v-model:checked`, a label, and a clickable "Terms and Conditions" span that opens `ModalTermsAndConditions`. Used identically across the three call sites in tasks 3–5 to avoid duplicating this markup three times.

## 3. Territories claim flow (index.vue)

- [ ] 3.1 In `app/pages/recruiter/territories/index.vue`, import `useTermsAcceptance` and add local `termsChecked` state.
- [ ] 3.2 Render `Terms/AcceptanceCheckbox` near the finalize button, only when `!hasAcceptedCurrentTerms`.
- [ ] 3.3 Extend the finalize button's `:disabled` condition to also require `hasAcceptedCurrentTerms || termsChecked`.
- [ ] 3.4 In `submitSchedule`, if `!hasAcceptedCurrentTerms`, `await acceptTerms()` before the `$fetch('/api/stripe/create-checkout', ...)` call, so the write is committed before the server-side guard runs.

## 4. Territories upgrade flow (edit.vue)

- [ ] 4.1 Apply the identical treatment from tasks 3.1–3.4 to `app/pages/recruiter/territories/edit.vue`'s `submitUpgrade` handler and its submit button.

## 5. Profile page acceptance

- [ ] 5.1 In `app/pages/recruiter/profile.vue`, add a "Terms & Conditions" section (near the existing billing-currency section).
- [ ] 5.2 If `!hasAcceptedCurrentTerms`: render `Terms/AcceptanceCheckbox` plus a standalone "Accept & Save" button that calls `acceptTerms()` directly (independent of `saveProfileCategories`/currency-save flows — this is its own action, not bundled with unrelated preference changes).
- [ ] 5.3 If `hasAcceptedCurrentTerms`: render a confirmation line ("You accepted our Terms & Conditions on {date}", using `termsAcceptedAt`) with a "View" link that still opens `ModalTermsAndConditions` — no checkbox.

## 6. Server-side enforcement

- [ ] 6.1 In `server/api/stripe/create-checkout.post.ts`, after the existing user-discount fetch (`userDoc`/`userData`, section 2.5), add: if `userData.termsAcceptedVersion !== CURRENT_TERMS_VERSION` (imported from `shared/utils/terms.ts`), `throw createError({ statusCode: 403, message: 'Terms and Conditions must be accepted before checkout.' })`.
- [ ] 6.2 Add a unit test in `server/api/stripe/tests/create-checkout.spec.ts` asserting a 403 when `termsAcceptedVersion` is missing or stale, and that checkout proceeds normally when it matches `CURRENT_TERMS_VERSION`.

## 7. i18n

- [ ] 7.1 Add UI-chrome strings (checkbox label, "Terms and Conditions" link text, "Accept & Save", the profile confirmation line) to `recruiter.json` in both `en-GB` and `en-US`.
- [ ] 7.2 Confirm `terms-and-conditions.json` (already drafted, both locales) is picked up correctly by the i18n loader — add it to any manual locale-namespace registration if this repo's i18n config requires one (check `i18n/locales/en-GB/index.ts` / `en-US/index.ts`).

## 8. Tests

- [ ] 8.1 Add/update tests for `useTermsAcceptance` covering both the accepted and not-accepted states.
- [ ] 8.2 Add a test on `territories/index.vue` (or its checkout-submission logic) asserting the finalize button stays disabled until the checkbox is checked, for a recruiter who hasn't yet accepted.
- [ ] 8.3 Add the equivalent test for `territories/edit.vue`.
- [ ] 8.4 Add a test asserting the checkbox does **not** render for a recruiter whose `termsAcceptedVersion` already matches `CURRENT_TERMS_VERSION`, on both territories pages and the profile page.

## 9. Verification

- [ ] 9.1 Manual check: a recruiter with no `termsAcceptedVersion` sees the checkbox on the territories claim page, cannot submit until checked, and after a successful checkout no longer sees it on any page.
- [ ] 9.2 Manual check: accepting from the profile page (without going through checkout) also removes the checkbox everywhere.
- [ ] 9.3 Manual check: bypassing the disabled button client-side (e.g. via devtools) and submitting anyway still gets rejected with the 403 from the server-side guard.
- [ ] 9.4 Run local verification `pnpm vitest run`.
