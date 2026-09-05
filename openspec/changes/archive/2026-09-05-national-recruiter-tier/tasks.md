## 1. Core Models

- [x] 1.1 In `shared/utils/types.ts`, add `isUkNational?: boolean;` and `isUsaNational?: boolean;` to `UserProfile`.

## 2. Search Aggregation (`recruiter-card.get.ts`)

- [x] 2.1 In `server/api/user/search/recruiter-card.get.ts`, remove the early return block: `if (!claimSnap.exists) { return { success: true, cards: [] }; }`.
- [x] 2.2 After fetching the local `claimData` (if it exists), determine the target national flag: `const targetFlag = territoryId < 200 ? 'isUkNational' : 'isUsaNational';`.
- [x] 2.3 Execute a live query: `await db.collection('users').where(targetFlag, '==', true).where('coveredCategories', 'array-contains', category).limit(10).get();`
- [x] 2.4 Merge the resulting UIDs from the live query into the local `basicOwners` array, deduping via `new Set()`, before the existing basic-owner shuffle logic.
- [x] 2.5 Update `server/api/user/search/tests/recruiter-card.spec.ts` with new test cases covering the merged query and the removed early-return.
- [x] 2.6 ADDED post-implementation, found during manual QA: a national recruiter
      failed to surface for a real search ("software developer" in "London")
      because `useRecruiterCards.ts`'s `territoryId` lookup only matched a
      searched location against each territory's own `name`, and the actual
      territory is named "Greater London" — the search location string never
      matched. Root cause was broader than one place name: any UK location
      whose display name isn't a territory's exact `name` (region/nation names
      like "Scotland", or towns absent from the territory list) resolved to a
      `null` territoryId, which short-circuited the client fetch before the
      National query in 2.3 ever ran. Fixed in two layers: (1)
      `useRecruiterCards.ts` now also matches each UK territory's
      `ons_matches` list (same source `Territory/Map.vue` already uses), and
      (2) both callers (`pages/salary` and `pages/benchmark`) now thread
      through the `country` ('UK'/'USA') already resolved from the route param
      via `useLocationEngine`, so `recruiter-card.get.ts` accepts an optional
      `country` query param as a fallback to `territoryId` and runs the
      National query directly (skipping the local claim-doc lookup, which has
      no meaning without a resolved territory) whenever no specific territory
      is resolved. See the new "Search Location Does Not Resolve to a Known
      Territory" scenario in `spec.md`.

## 3. Pricing Updates

- [x] 3.1 REVISED during implementation: `create-checkout.post.ts`'s Checkout-Session-creation
      path is only ever reached for a recruiter with NO existing `stripeSubscriptionId`
      (task 9.2 intercepts everyone who already has one before reaching this code).
      Since task 4's `set-national.post.ts` requires an existing subscription as a
      precondition for granting national (§4.2a), a nationally-flagged recruiter can
      never reach this path — adding national pricing here would be dead code for an
      invariant enforced elsewhere. No change made to this file's Checkout-Session path;
      national pricing is instead handled in 3.2 (cancel-territory.post.ts, which DOES
      run for existing-subscription users) and 9.3 (the new existing-subscription branch).
- [x] 3.2 In `server/api/stripe/cancel-territory.post.ts`: add the flat national charge
      (Band 1 basic price, minus `basicDiscount`, once per active flag) as a single
      unconditional addition to `newMonthlyTotal` after its per-territory `forEach` loop
      completes. ALSO fix a compounding edge case this surfaced: the existing
      "cancel the whole subscription when `newMonthlyTotal === 0`" branch must not fire
      when the recruiter still holds an active national flag (a 100%-discounted national
      grant legitimately prices to $0 but still needs a live subscription object, same
      reasoning `create-checkout.post.ts` already applies to a $0 basic plan) — gate it on
      `newMonthlyTotal === 0 && activeNationalFlags === 0`.
- [x] 3.3 Add test assertions for national total calculations in `cancel-territory.spec.ts`
      (flat charge on top of remaining local territories; $0-national-total does not
      cancel the subscription). No equivalent test needed in `create-checkout.spec.ts`
      per 3.1 — covered instead by 9.7's existing-subscription branch tests.

## 4. Admin API Endpoint

- [x] 4.1 Create `server/api/admin/recruiters/set-national.post.ts`. Accepts `uid`, `country` ('UK' or 'USA'), and `active` (boolean). Admin auth is inherited from the existing `/api/admin/**` global middleware (`server/middleware/admin-guard.ts`); no inline check needed.
- [x] 4.2 If `active` is true: REVISED — added a precondition the original task didn't cover: refuse the grant with a 400 if the recruiter has no existing `stripeSubscriptionId` (national coverage bills through the existing subscription; with no prior checkout there's no payment method to charge). Otherwise filter the user's `activeTerritories` to find every local claim matching the target country, then for EACH matching claim, surgically clean up its `territory_category_owners/{territoryId}_{categoryValue}` doc by mirroring the pattern in `cancel-territory.post.ts` — remove only this uid from `basicOwners` via `FieldValue.arrayRemove`, remove only this uid's entries from `takenExclusiveMonths`, and delete the doc only if it ends up with no remaining basic owners or taken months. Other recruiters' ownership on shared docs is left untouched. Then remove the matching claims from `activeTerritories` and set `isUkNational` or `isUsaNational` to true.
- [x] 4.3 If `active` is false: Set the corresponding flag to false. Do not restore old local territories.
- [x] 4.4 Run the Stripe subscription update logic (reusing the accurate total calculation, including the same $0-with-active-national-flag guard from 3.2) and save the user. Stripe is updated BEFORE the Firestore batch commits (mirrors `cancel-territory.post.ts`'s ordering).
- [x] 4.5 Add >80% coverage unit tests for `set-national.post.ts` (13 tests, 95.87%/80.76%/100%/95.74% stmt/branch/func/line coverage).

## 5. UI Updates

- [x] 5.1 In `app/pages/admin/recruiters.vue`, added a "Manage National Coverage" modal
      (Globe icon action button) with per-country Grant/Revoke buttons calling
      `set-national`, plus badges next to the agency name showing active national
      status. Also updated `server/api/admin/recruiters/index.get.ts` to return
      `isUkNational`/`isUsaNational` and fold the flat national charge into the
      reported `monthlyInvoice` (it was previously under-reporting nationally-flagged
      recruiters' real total) — verified/tested via `index.spec.ts`.
- [x] 5.2 In `app/pages/recruiter/dashboard.vue`, render a distinct banner (Globe icon)
      when `isUkNational` or `isUsaNational` is true.
- [x] 5.3 Added `recruiter.dashboard.nationalBanner` to both
      `i18n/locales/en-GB/recruiter.json` and `i18n/locales/en-US/recruiter.json`.

## 6. Manual Pre-Deploy Step

- [x] 6.1 REVISED during validation: the original field names (`isUkNational`/
      `isUsaNational`, boolean) were superseded mid-implementation by
      `ukNationalStatus`/`usaNationalStatus` (a `'pending'`/`'active'` status
      string — see section 4), so the composite index this task originally
      specified was never actually created against the real field names.
      Verified via `firebase firestore:indexes --project amiunderpaid-5a509`
      that no index exists for `ukNationalStatus`/`usaNationalStatus` +
      `coveredCategories`, yet live browser testing of
      `server/api/user/search/recruiter-card.get.ts`'s
      `.where(targetStatusKey, '==', 'active').where('coveredCategories', 'array-contains', category)`
      query against the real project returned correct results with no
      Firestore index error — this combination (one equality filter + one
      `array-contains` filter, no `orderBy`) falls within Firestore's
      automatically-managed indexes, so no manual composite index is required
      for this query shape. No admin action needed.

## 8. UI Restriction: Disable Basic Tier for Nationally-Covered Territories

Discovered during implementation: a nationally-flagged recruiter must not be able to
buy local Basic coverage again in the country they're already nationally covered
for (redundant spend), but must still be able to buy Exclusive months on
individual territories there (national does not cover Exclusive).

- [x] 8.1 In `app/composables/useScheduleMath.ts`, lock the Basic toggle (same as an
      already-owned claim) for any row whose territory's country matches a national
      flag the recruiter holds (`territoryId < 200` → `isUkNational`, else
      `isUsaNational`), unless a real `TerritoryClaim` already exists for that exact
      territory+category (which always wins). Track this as a distinct `isNational`
      reason (not `owned`) so the UI can label it correctly, and ensure `emitUpdates`
      never emits `isBasic: true` for a nationally-locked row (it must remain
      billable only via Exclusive month selection).
- [x] 8.2 In `app/components/Territory/ScheduleMatrix.vue`, show a "National" badge
      (distinct from "Owned") for nationally-locked rows.
- [x] 8.3 Add `recruiter.schedule.national` to both `i18n/locales/en-GB/recruiter.json`
      and `i18n/locales/en-US/recruiter.json`.
- [x] 8.4 Add test coverage in `app/composables/tests/useScheduleMath.spec.ts` for:
      national lock takes effect, a real owned claim wins over national, no billable
      Basic is emitted for a national-only row, and Exclusive months remain
      purchasable (at the discounted upgrade price) on a nationally-locked row.

## 9. Checkout Subscription Reuse Fix (Normal + National Users)

Discovered during implementation: `create-checkout.post.ts` always creates a brand
new Stripe subscription via `stripe.checkout.sessions.create`, and
`webhook.post.ts` unconditionally overwrites `stripeSubscriptionId` with the new
session's subscription id. A recruiter who already has an active subscription and
buys more territory therefore gets a second, disconnected subscription while the
first is silently orphaned in Stripe (still billing, no longer referenced anywhere)
— pre-existing, but this change makes it bite immediately: a nationally-flagged
recruiter's flat charge lives on the first subscription, so any later self-service
purchase would start double-billing it. Fix applies to ALL returning recruiters,
not just nationally-flagged ones.

- [x] 9.1 Extracted the conflict-checked "compute the updated territory list + claim
      doc writes" logic from `webhook.post.ts`'s transaction into a pure,
      no-Firestore-I/O function `computeTerritoryFulfillment` in the new
      `server/utils/territoryFulfillment.ts`. `webhook.post.ts` now calls it inside
      its existing transaction; all 21 pre-existing `webhook.spec.ts` tests pass
      unchanged (pure refactor, no behavior change for the webhook path). Also
      extracted the shared refund-failure alert email (`sendHumanAlert`) into
      `server/utils/billingAlerts.ts` as `sendBillingFailureAlert`, generalized to
      take a human-readable reference string instead of a `Stripe.Checkout.Session`,
      since both the webhook path and the new existing-subscription checkout path
      (9.5) need to alert ops on the same risk class via different Stripe object
      shapes. Added `server/utils/tests/territoryFulfillment.spec.ts` (6 tests).
- [x] 9.2 In `create-checkout.post.ts`, added a branch on whether
      `userData.stripeSubscriptionId` already exists: if not set, existing
      Checkout-Session behavior is unchanged; if set, Checkout Session creation is
      skipped entirely. The branch retrieves the existing subscription via
      `stripe.subscriptions.retrieve` for its `customer` id, then pre-checks for
      exclusive-month conflicts read-only (reusing 9.1's pure function against the
      current claim docs) and rejects with 409 before charging anything on conflict.
- [x] 9.3 On a clean pre-check, recomputes the grand-total recurring price across
      every basic territory the recruiter will hold after the purchase (existing +
      new, mirroring `cancel-territory.post.ts`'s banded pricing/discount logic —
      band re-resolved from the static territory lists for every entry, never
      trusting a stored `band` field), plus the flat national charge if
      `isUkNational`/`isUsaNational` is set, and updates the subscription's line
      item to that total via `stripe.subscriptions.update`.
- [x] 9.4 REVISED during implementation: the original wording
      (`stripe.invoices.create({ auto_advance: true, collection_method:
'charge_automatically' })`) was verified against Stripe's live API docs
      before implementing and found to be wrong — `auto_advance: true` only queues
      automatic collection on Stripe's own schedule, it does not synchronously
      charge within the request. The correct verified sequence (confirmed via
      Stripe's `/invoices/finalize` and `/invoices/pay` API reference) is:
      `stripe.invoiceItems.create` → `stripe.invoices.create({ auto_advance: false,
collection_method: 'charge_automatically' })` → `stripe.invoices.finalizeInvoice`
      → `stripe.invoices.pay` (this last call is what actually attempts the
      off-session charge synchronously and returns the settled invoice). If the
      returned invoice's `status` isn't `'paid'`, or any step throws, the purchase
      fails with an opaque 500 before any Firestore write. This sequence was
      then verified a second time against this account's real test-mode API
      (the user supplied a `sk_test_...` key for exactly this purpose), and
      the docs-based plan above turned out to be wrong on two further, more
      serious points the docs alone didn't surface: on this account/API
      version, `finalizeInvoice` alone already synchronously settles the
      invoice as `'paid'` when a default payment method is on file (calling
      `pay()` afterward throws "Invoice is already paid" and would have
      hard-failed every successful purchase, fixed by only calling `pay()`
      when `finalizeInvoice`'s returned status isn't already `'paid'`), and
      `stripe.invoices.create()` does not auto-attach the customer's pending
      invoice item by default on this account (without
      `pending_invoice_items_behavior: 'include'`, the created invoice has 0
      line items and a $0 total, which then finalizes as trivially "paid"
      having charged nothing, silently granting paid exclusive-month territory
      for free on every purchase, fixed by adding
      `pending_invoice_items_behavior: 'include'` to the `invoices.create`
      call). Both fixes were confirmed end-to-end against the live test API
      (correct $100 charge captured; correct behavior when no default payment
      method is on file; `invoicePayments.list` plus `refunds.create` refund
      path confirmed; subscription line-item revert-to-previous-total
      confirmed), then the mocked `create-checkout.spec.ts` suite was updated
      to match (added a test asserting `pending_invoice_items_behavior:
'include'` and a test covering the finalize-already-paid
      short-circuit). No throwaway verification script or credential was
      committed to the repo.

- [x] 9.5 The Firestore fulfillment transaction (via 9.1's shared function) commits
      only after the Stripe charge(s) in 9.3/9.4 succeed, with a final
      in-transaction conflict re-check. On a late-discovered conflict: refunds the
      just-charged invoice payment (via `invoicePayments.list` +
      `stripe.refunds.create`, same technique as `webhook.post.ts`), reverts the
      subscription's recurring line item back to its pre-purchase amount, and
      alerts ops via `sendBillingFailureAlert` if the reversal itself fails
      (charge-first-then-fulfill is this repo's existing accepted risk model for
      the Checkout+webhook path too, so this isn't a new risk class).
- [x] 9.6 Updated `app/pages/recruiter/territories/index.vue`'s `submitSchedule` to
      handle the new response shape: when `response.url` is null (existing-
      subscription path), shows a success toast
      (`recruiter.territories.claim.purchase-success`, added to both
      `i18n/locales/en-GB/recruiter.json` and `en-US/recruiter.json`) and routes to
      `/recruiter/dashboard` instead of redirecting via `window.location.href`.
- [x] 9.7 Added 12 new tests to `create-checkout.spec.ts` for the
      existing-subscription branch: recurring-total update, upfront invoice charge
      (invoiceItems → invoices.create → finalizeInvoice → pay), national flat
      charge folded into the recurring total, `categoryValue` "ALL" fallback,
      missing-pricing-band 500, non-`'paid'` invoice-status 500, empty-cart and
      zero-priced-exclusive 400s, pre-charge 409 conflict rejection,
      Stripe-update-failure blocks the Firestore transaction, and two
      late-conflict reversal tests (successful refund+revert, and alert-on-
      reversal-failure covering the unresolvable-payment-intent branch). Full
      suite: 802/802 tests passing; `pnpm test:coverage` reports every touched
      file (including `create-checkout.post.ts` at 98.4%/86.82%,
      `territoryFulfillment.ts` at 100%/95.83%, `billingAlerts.ts` at
      88.88%/100%) above the 80% per-file gate on all four metrics.

## 10. Verification

- [x] 10.1 Ran `pnpm test:verify`. `pnpm lint` (spellcheck, typecheck, Prettier,
      structure-lint, check-standards, ESLint with `--max-warnings 0`) passes
      clean. `pnpm test:coverage` passes: 802/802 unit tests, every file
      (including every file touched this session) above the 80% per-file gate
      on all four metrics. `pnpm test:e2e` passes: 20/20 Playwright tests.
      `pnpm test:rules` (Firestore rules tests) could not run — blocked by a
      pre-existing local environment gap, not a regression from this change:
      `firebase-tools`'s emulator now requires Java 21+, and this machine has
      Java 8 installed (`firebase-tools no longer supports Java version before
21`). This change touches no Firestore security rules, so this gap is
      unrelated to `national-recruiter-tier`'s scope; flagged to the user
      rather than worked around by installing a JDK unprompted.

## 11. Tri-State National Status (Pending Confirmation Flow)

Discovered during implementation: granting national coverage via the admin UI to a
recruiter with no existing Stripe subscription failed with a 400 (task 4.2's
precondition). Decided with the user: admin can now grant national coverage
regardless of subscription state. A recruiter with an existing subscription is
billed immediately by updating that subscription (status goes straight to
`'active'`, reusing task 4's existing Stripe-update logic, no immediate prorated
charge since `proration_behavior: 'none'` means it lands on their next invoice). A
recruiter with no subscription is granted a `'pending'` status with no Stripe calls
at all, and must confirm via a new dashboard banner (mirroring
`Toast/EmailVerification.vue`'s pattern) that routes them through Stripe Checkout
to create their first subscription, priced to include the national flat charge.
`isUkNational`/`isUsaNational` booleans become `ukNationalStatus`/
`usaNationalStatus: 'pending' | 'active' | undefined` across the codebase --
confirmed with the user that no real recruiter data exists yet with the old boolean
fields set, so this is a clean rename with no migration step needed.

- [x] 11.1 In `shared/utils/types.ts`, replace `isUkNational?: boolean;
isUsaNational?: boolean;` on `UserProfile` with `export type NationalStatus =
'pending' | 'active';` plus `ukNationalStatus?: NationalStatus;
usaNationalStatus?: NationalStatus;`.
- [x] 11.2 In `server/api/admin/recruiters/set-national.post.ts`: remove the 400
      refusal requiring `stripeSubscriptionId` (task 4.2's precondition). On grant
      (`active: true`): if `stripeSubId` exists, keep today's behavior (wipe local
      target-country claims + claim-doc cleanup + Stripe subscription update) and
      set the status field to `'active'`; if not, skip Stripe entirely and skip the
      local-claim wipe (deferred to confirmation-time in 11.4, since a
      subscription-less recruiter cannot hold a real local claim -- every local
      claim requires having gone through a prior checkout, which requires a
      subscription), just set the status field to `'pending'` and return the
      unchanged (non-national) total. On revoke (`active: false`): clear the status
      field via `FieldValue.delete()` instead of setting `false`; the existing
      "only touch Stripe if `stripeSubId` is set" guard already handles revoking a
      pending grant correctly (no Stripe call needed). The flat-national-charge
      total calculation's "other country" check must only count the other country
      when its status is `'active'` (not `'pending'`, which isn't billed yet).
- [x] 11.3 In `server/api/stripe/create-checkout.post.ts`'s new-Checkout-Session
      branch (the one 3.1 left unimplemented as dead code -- no longer dead once
      11.2 ships): when the checkout's own `countryKey` matches a `'pending'`
      status (`ukNationalStatus` for UK, `usaNationalStatus` for USA), add the flat
      Band 1 national charge to `monthlyTotal` and increment `basicCount` so a
      subscription is created even with an empty territories cart (a pure
      national-confirmation checkout has no territories). Encode `nationalCountry:
countryKey` into the session metadata when this applies, and fold the charge
      into the existing single recurring line item -- never add a second recurring
      line item, since every other endpoint that later updates this subscription
      (`cancel-territory.post.ts`, `set-national.post.ts`, this file's own 3.5
      branch) assumes exactly one item at `subscription.items.data[0]`. REVISED
      during implementation: a recruiter can legitimately hold two pending grants
      at once (admin grants both UK and USA while no subscription exists yet), and
      confirming the first creates a subscription -- so confirming the SECOND
      country now reaches the existing-subscription branch (3.5), not this one.
      3.5 didn't handle that case (it only read `isUkNational`/`isUsaNational` as
      already-active booleans), so it also gained: an `isConfirmingNational` bypass
      for its empty-cart 400 guard, the pending country's flat charge folded into
      `grandMonthlyTotal` alongside any already-active flags, and a status flip to
      `'active'` written directly in its Firestore transaction (no webhook needed,
      since 3.5 never goes through Stripe Checkout's hosted page).
- [x] 11.4 In `webhook.post.ts`'s `checkout.session.completed` handler: read
      `session.metadata?.nationalCountry`; tolerate an empty `cart` (a
      national-only checkout has no territories, so the compressed cart string is
      `''`) by only requiring `userId` plus at least one of `cart`/`nationalCountry`
      to be present, rather than unconditionally requiring both. When
      `nationalCountry` is set, strip any territories in that country's id range
      from the resulting `activeTerritories` (defensive, mirrors 11.2's invariant)
      and set the matching status field to `'active'` in the same transactional
      write that sets `stripeSubscriptionId`.
- [x] 11.5 New component `app/components/Toast/NationalConfirmation.vue`, mirroring
      `Toast/EmailVerification.vue`'s pattern (`ToastGeneric`, full-width, no
      auto-dismiss timer): shown whenever `userProfile.ukNationalStatus ===
'pending'` or `usaNationalStatus === 'pending'`; renders one row per pending
      country with a "Confirm" button that POSTs `/api/stripe/create-checkout` with
      `{ territories: [], currency: 'gbp' | 'usd' }` (matching the pending country)
      and redirects `window.location.href` to the returned `session.url`. Add
      `<ToastNationalConfirmation />` to `app/pages/recruiter/dashboard.vue`
      alongside the existing `<ToastEmailVerification />`.
- [x] 11.6 i18n: add a `national-confirmation` namespace to
      `i18n/locales/en-GB/toast.json` and `en-US/toast.json` (title/message/
      action.confirm/action.error), following `verify-email`'s existing shape.
- [x] 11.7 Update every remaining reader of the old boolean flags for the new
      field/value shape: `app/composables/useScheduleMath.ts` (`isNationallyCovered`
      truthy on either status -- a pending grant must still lock local Basic, since
      confirming later would otherwise wipe a local Basic purchase made in the
      interim with no refund), `server/api/user/search/recruiter-card.get.ts`
      (`targetFlag` renamed, query value `'active'` not `true` -- a pending,
      unpaid grant must not surface in lead-gen search results),
      `server/api/admin/recruiters/index.get.ts` (return `ukNationalStatus`/
      `usaNationalStatus`; only count `'active'` toward `monthlyInvoice`),
      `app/pages/admin/recruiters.vue` (badges distinguish pending vs active;
      modal button reflects the current status), `server/api/stripe/
cancel-territory.post.ts` (only `'active'` counts toward the flat charge),
      `app/pages/recruiter/dashboard.vue` (existing active banners keyed off
      `=== 'active'`, not raw truthiness).
- [x] 11.8 Update all affected tests: `set-national.spec.ts`, `create-checkout.spec.ts`,
      `webhook.spec.ts`, `useScheduleMath.spec.ts`, `index.spec.ts` (admin
      recruiters), `cancel-territory.spec.ts`, `recruiter-card.spec.ts`, plus a new
      `tests/` spec for `NationalConfirmation.vue` per CODE_STANDARDS.md #8's
      logic-bearing-`AmI`-component convention -- N.B. this is a `Toast/**`
      component, not `AmI/**`, but carries genuine conditional-rendering/fetch
      logic the same way, so the same convention applies by analogy.
- [x] 11.9 **MANUAL ADMIN ACTION UPDATE:** task 6.1's composite indexes must target
      the renamed fields -- `ukNationalStatus` (Ascending) + `coveredCategories`
      (Arrays), and `usaNationalStatus` (Ascending) + `coveredCategories` (Arrays)
      -- not the old `isUkNational`/`isUsaNational` names. Flag to the user before
      they finish creating the indexes from task 6.1, since they were mid-creation
      of the old-named indexes when this section was discovered.
- [x] 11.10 Ran `pnpm lint` (spellcheck, `pnpm typecheck`, Prettier, structure-lint,
      check-standards, ESLint with `--max-warnings 0`), `pnpm test:coverage`, and
      `pnpm test:e2e` individually (equivalent to `pnpm test:verify` minus
      `test:rules`, run this way since a concurrent `node_modules` reinstall in
      another terminal interrupted the first attempt). All pass clean: lint 0
      issues; 818/818 unit tests across 105 files, every touched file (including
      `set-national.post.ts` at 95.87%/83.33%, `create-checkout.post.ts` at
      97.98%/86.89%, `webhook.post.ts` at 100%/89.39%, `recruiter-card.get.ts` at
      100%/98.18%, `cancel-territory.post.ts` at 98.93%/82.27%,
      `index.get.ts` at 97.72%/82%) above the 80% per-file gate on all four
      metrics; `pnpm test:e2e` 20/20 Playwright tests. `pnpm test:rules` still
      could not run -- same pre-existing local Java 8 environment gap noted in
      10.1, re-checked and unchanged (`java -version` still reports 1.8.0_481);
      this change touches no Firestore security rules, so it's unrelated to this
      section's scope.
