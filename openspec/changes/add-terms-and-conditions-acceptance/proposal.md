## Why

Recruiters can currently purchase territories and enter a paying subscription without ever agreeing to any Terms & Conditions. There is no contractual basis for the platform's own billing, cancellation, exclusivity, or liability positions — several of which (self-service cancellation, no-proration-on-downgrade, the double-sold-territory refund) are already real, coded behaviors with no corresponding agreement backing them.

Content has been drafted (`i18n/locales/en-GB/terms-and-conditions.json`, mirrored to `en-US`) covering acceptance, account access, pricing/payment, the free trial, subscription management, refunds, exclusivity scope, acceptable use, data protection, IP, a 12-months'-fees liability cap, termination, changes-to-terms, England & Wales governing law, and contact. This change wires that content into an actual acceptance flow.

## What Changes

- Add `termsAcceptedAt` (ISO timestamp) and `termsAcceptedVersion` (string, matching the content's "last updated" date) to the recruiter's `users/{uid}` document.
- Add a shared `CURRENT_TERMS_VERSION` constant (importable from both client and server code) as the single source of truth for which version is currently in force.
- Add a `useTermsAcceptance` composable exposing `hasAcceptedCurrentTerms` (compares `termsAcceptedVersion` against `CURRENT_TERMS_VERSION`) and `acceptTerms()` (writes both fields via the existing `updateProfile`).
- Add a `ModalTermsAndConditions` component (wraps the existing `ModalGeneric`, per the same pattern as `Modal/CancelTerritory.vue` and `Modal/RequestAccess.vue`) rendering the `terms-and-conditions.json` content. Openable by clicking the words "Terms and Conditions" wherever the checkbox appears.
- Add a reusable acceptance checkbox (label + "Terms and Conditions" link opening the modal) to:
  - `territories/index.vue`'s Step 2 finalize button area — only rendered if `!hasAcceptedCurrentTerms`; the finalize button stays disabled until it's checked, in addition to its existing `scheduleSelections.length === 0` gate.
  - `territories/edit.vue`'s upgrade submit button — same treatment, same reason (it calls the same checkout endpoint).
  - `profile.vue` — a standalone "Accept & Save" action, independent of checkout. Once accepted, this section shows a confirmation line ("You accepted our Terms & Conditions on {date}") with a "View" link instead of the checkbox.
- On successful submission from either territories page, call `acceptTerms()` immediately before the checkout request (only when the checkbox was actually used, i.e. wasn't already accepted), so the write is committed before the server-side check below runs.
- Add a server-side guard in `server/api/stripe/create-checkout.post.ts`: reject with 403 if `userData.termsAcceptedVersion !== CURRENT_TERMS_VERSION`. This is the actual enforcement point — a disabled button alone is trivially bypassable client-side, so this is what makes acceptance a real precondition rather than cosmetic. Uses the `userDoc`/`userData` the endpoint already fetches for discounts, no extra Firestore read needed.

## Scope

`shared/utils/types.ts`, a new shared terms-version constant, `app/composables/useTermsAcceptance.ts`, `app/components/Modal/TermsAndConditions.vue`, a small reusable acceptance-checkbox component, `app/pages/recruiter/territories/index.vue`, `app/pages/recruiter/territories/edit.vue`, `app/pages/recruiter/profile.vue`, `server/api/stripe/create-checkout.post.ts`, `i18n/locales/{en-GB,en-US}/terms-and-conditions.json` (already drafted), plus small UI-string additions to `recruiter.json` in both locales and the relevant test suites.

## Non-Goals

- Building a generic terms-versioning/legal-document-history system — this is scoped to one current-version check, not an audit trail of every prior version's text.
- Any change to the actual billing/cancellation/refund mechanics described in the Terms — this change only adds the acceptance gate around behavior that already exists.
- Firestore rules changes — `termsAcceptedAt`/`termsAcceptedVersion` are not in the existing `users/{userId}` update deny-list (`role`, `status`, `activeTerritories`, `basicDiscount`, `exclusiveDiscount`, `stripeSubscriptionId`), so self-service writes already work under the current rules.
- Finalizing the placeholder legal entity name, registered address, or contact email in the Terms content — those stay as explicit placeholders until the business is incorporated, per earlier discussion.

## Capabilities

### New Capabilities

- `terms-and-conditions-acceptance`: defines the acceptance requirement, the checkbox/modal UI behavior, the server-side enforcement, and the "don't show the checkbox once already accepted" behavior.

## Impact

- **Affected code:** see Scope above.
- **Data migration:** none required — existing recruiters simply have no `termsAcceptedVersion` (undefined ≠ `CURRENT_TERMS_VERSION`), so they'll see the checkbox on their next visit to either territories page or their profile, exactly like a brand-new recruiter would.
- **User-facing effect:** any recruiter without a matching `termsAcceptedVersion` sees a checkbox gate before completing a purchase or upgrade, and can also accept from their profile at any time without needing to be mid-checkout.
