## 1. Critical Bug Fixes

- [x] 1.1 In `cancel-territory.post.ts`: Build a list of `removedExclusiveMonths` by diffing `currentTerritories` vs `updatedTerritories` for the cancelled territory. For each removed month, call `FieldValue.delete()` on `territory_claims.takenExclusiveMonths[month]`. Use a Firestore batch to commit both the user document update and the claims cleanup atomically. If the resulting claims map is empty, delete the document.
- [x] 1.2 In `dashboard.vue` (`executeCancel`): Remove the optimistic local mutation of `userProfile.value.activeTerritories` after the API call succeeds. Let the real-time `useDocument` listener drive the UI update. Keep the `isCancelling` state until the listener fires.
- [x] 1.3 In `accept.post.ts`: Replace the hardcoded `https://amiunderpaid.co.uk/recruiter/login` login URL with a value from `useRuntimeConfig().public.siteUrl` (or equivalent config key), falling back to `https://amiunderpaid.co.uk/recruiter/login`.
- [x] 1.4 In `reject.post.ts`: After updating the Firestore document status to `rejected`, queue a `mail` document to the recruiter's email address notifying them of the rejection outcome.

## 2. UX Hardening — Replace alert() Calls

- [x] 2.1 In `territories/index.vue` (`submitSchedule` catch block, line ~340): Replace `alert('Something went wrong…')` with `showToast('Error', 'Something went wrong calculating the cart. Please try again.', 'error')`. Import `useSystemToast` if not already present in this component.
- [x] 2.2 In `profile.vue` (`saveProfileCategories` catch block, line ~465): Replace `alert('Failed to save categories…')` with `showToast('Error', 'Failed to save. Please try again.', 'error')`.

## 3. Territory Claims Limit Warning

- [x] 3.1 In `useTerritoryClaims.ts`: Expose a new reactive `claimsLimitExceeded` computed boolean that is `true` when `territoryIds.value.length > 10`.
- [x] 3.2 In `territories/index.vue` step 2: Display a warning banner when `claimsLimitExceeded` is `true`, informing the recruiter that availability data may be incomplete for territories beyond the first 10.

## 4. Dead Code Removal

- [x] 4.1 In `useRecruiterAuth.ts`: Remove the `signup()` function export (it bypasses the admin approval gate). Confirm no active UI route calls `signup()` before removing.
- [x] 4.2 Verify that `recruiter/login.vue` does not render any direct signup form or link to one. Remove any residual references.

## 5. Verification

- [x] 5.1 Run `pnpm format` and confirm zero formatting errors.
- [x] 5.2 Run `pnpm eslint .` and confirm 0 new errors introduced (warnings from pre-existing console statements are acceptable).
- [x] 5.3 Run `pnpm nuxi typecheck` and confirm the only remaining errors are the pre-existing test spec argument-count errors (unrelated to this change).
- [ ] 5.4 Manually verify cancellation removes locks in Firestore by inspecting the `territory_claims` collection before and after a test cancellation in the development environment.
