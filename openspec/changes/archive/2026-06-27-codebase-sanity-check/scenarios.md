# Codebase Sanity Check — User Journey & Edge Case Scenarios

Each scenario should be manually tested in a staging environment and marked Pass or Fail.

---

## 1. Recruiter Access Request Flow

- [ ] Pass / [ ] Fail: A new visitor clicks "Request Access" on the recruiter login page — the modal opens correctly with agency name and email fields.
- [ ] Pass / [ ] Fail: Submitting the Request Access form with a valid agency name and email creates a new Firestore document in `users` with `status: "requested"` and `role: "recruiter"`.
- [ ] Pass / [ ] Fail: Submitting the Request Access form with a duplicate email shows an error toast — no new Firestore document is created.
- [ ] Pass / [ ] Fail: Submitting the Request Access form with an invalid email format shows a validation error without making an API call.
- [ ] Pass / [ ] Fail: Submitting the Request Access form with empty fields shows a validation error without making an API call.
- [ ] Pass / [ ] Fail: After submitting, the modal closes and a success toast is displayed.
- [ ] Pass / [ ] Fail: The newly submitted request appears in the admin `/admin/recruiters` page with status "Requested" and action buttons (Accept / Reject).

---

## 2. Admin: Approve Recruiter

- [ ] Pass / [ ] Fail: An admin clicks "Accept" on a pending recruiter — a Firebase Auth user is created with the Firestore document ID as the UID.
- [ ] Pass / [ ] Fail: After acceptance, the recruiter's Firestore document status is updated to `active` and `requiresPasswordChange: true`.
- [ ] Pass / [ ] Fail: After acceptance, the recruiter receives a welcome email containing a temporary password and a correct login link (multi-tenant aware — not hardcoded to `.co.uk`).
- [ ] Pass / [ ] Fail: Attempting to accept a recruiter that is already `active` returns a 400 error and does not send a duplicate email.
- [ ] Pass / [ ] Fail: An admin cannot accept a recruiter that has already been rejected.

---

## 3. Admin: Reject Recruiter

- [ ] Pass / [ ] Fail: An admin clicks "Reject" on a pending recruiter — the Firestore document status is updated to `rejected`.
- [ ] Pass / [ ] Fail: **[BUG — currently missing]** After rejection, the applicant receives a notification email informing them their request was unsuccessful.
- [ ] Pass / [ ] Fail: Attempting to reject a recruiter that is already `rejected` returns a 400 error.
- [ ] Pass / [ ] Fail: A rejected recruiter cannot log in (no Firebase Auth user was ever created).

---

## 4. Recruiter Login & First-Time Password Change

- [ ] Pass / [ ] Fail: A newly approved recruiter logs in with their temporary password successfully.
- [ ] Pass / [ ] Fail: After logging in with `requiresPasswordChange: true`, the middleware redirects the recruiter to `/recruiter/profile` on any page navigation.
- [ ] Pass / [ ] Fail: The recruiter can change their password on the profile page using the correct current (temporary) password.
- [ ] Pass / [ ] Fail: After a successful password change, `requiresPasswordChange` is cleared in Firestore and the recruiter can navigate freely.
- [ ] Pass / [ ] Fail: Entering the wrong current password during a password change shows an error message and does NOT update the password.
- [ ] Pass / [ ] Fail: Entering mismatched new passwords shows a validation error before any API call is made.
- [ ] Pass / [ ] Fail: Entering a new password shorter than 6 characters is blocked by client-side validation.

---

## 5. Territory Selection & Schedule Matrix

- [ ] Pass / [ ] Fail: A verified recruiter can select territories on the map and in the list view.
- [ ] Pass / [ ] Fail: Switching countries (UK ↔ USA) clears the selected territories.
- [ ] Pass / [ ] Fail: Selecting territories already owned by the recruiter marks them correctly (claimed state) without allowing re-purchase.
- [ ] Pass / [ ] Fail: The "Configure Schedule" button is disabled until at least 1 territory and 1 category are selected.
- [ ] Pass / [ ] Fail: Months already exclusively owned by other recruiters appear as locked/unavailable in the schedule matrix.
- [ ] Pass / [ ] Fail: Months already owned by the current recruiter appear as editable (not locked) in the matrix.
- [ ] Pass / [ ] Fail: **[BUG — currently missing]** Selecting more than 10 territories shows a visible warning that lock data is incomplete beyond 10 items.
- [ ] Pass / [ ] Fail: Unverified (email not confirmed) recruiters see the "Get Territories" button disabled on the dashboard.

---

## 6. Stripe Checkout

- [ ] Pass / [ ] Fail: Clicking "Secure Territories & Pay" redirects the recruiter to a Stripe hosted checkout page.
- [ ] Pass / [ ] Fail: The Stripe checkout line items correctly reflect the server-side calculated price (not the client-supplied price).
- [ ] Pass / [ ] Fail: Exclusive months for the current month past the halfway point receive a 50% discount.
- [ ] Pass / [ ] Fail: Custom recruiter discounts (`basicDiscount`, `exclusiveDiscount`) are applied server-side.
- [ ] Pass / [ ] Fail: Cancelling on the Stripe checkout page redirects back to `/recruiter/territories?checkout_cancelled=true` without any Firestore writes.
- [ ] Pass / [ ] Fail: **[BUG — currently broken]** If the checkout API call fails, an error toast is shown — NOT a blocking `alert()` dialog.
- [ ] Pass / [ ] Fail: A cart with zero line items (no basic, no exclusive) is rejected by the server with a 400 error.

---

## 7. Webhook Fulfilment (checkout.session.completed)

- [ ] Pass / [ ] Fail: After a successful payment, the recruiter's `activeTerritories` array is updated in Firestore within seconds.
- [ ] Pass / [ ] Fail: After a successful payment, the `territory_claims` collection is updated with the recruiter's exclusive month locks.
- [ ] Pass / [ ] Fail: The webhook correctly parses the compressed cart string from Stripe metadata.
- [ ] Pass / [ ] Fail: Purchasing a territory the recruiter already partially owns (upgrade) merges correctly rather than overwriting.
- [ ] Pass / [ ] Fail: The webhook rejects requests with an invalid Stripe signature (returns 400).
- [ ] Pass / [ ] Fail: The dashboard updates in real-time (without a page reload) after the webhook fires and Firestore is updated.

---

## 8. Territory Cancellation

- [ ] Pass / [ ] Fail: A recruiter can open the cancel confirmation modal from the dashboard.
- [ ] Pass / [ ] Fail: Confirming the cancel makes the territory card disappear from the dashboard UI (driven by Firestore real-time listener).
- [ ] Pass / [ ] Fail: **[BUG — currently broken]** After cancellation, the cancelled exclusive months are removed from `territory_claims` in Firestore — they are no longer locked for other recruiters.
- [ ] Pass / [ ] Fail: **[BUG — currently broken]** The dashboard UI does NOT flicker or show a momentary empty state due to optimistic mutation being overwritten by the real-time listener.
- [ ] Pass / [ ] Fail: If a recruiter cancels their last basic territory, the Stripe subscription is cancelled entirely.
- [ ] Pass / [ ] Fail: If a recruiter cancels one of multiple territories, the Stripe subscription is updated to the new monthly total.
- [ ] Pass / [ ] Fail: The cancel API correctly re-authenticates the user via their Firebase ID token before making any changes.
- [ ] Pass / [ ] Fail: Cancelling a territory that does not belong to the authenticated user is rejected (unauthorized).

---

## 9. Leads Page

- [ ] Pass / [ ] Fail: The leads table displays all inbound leads for the recruiter.
- [ ] Pass / [ ] Fail: The empty state ("No leads found yet") is shown when the recruiter has no leads.
- [ ] Pass / [ ] Fail: The email copy button copies the lead's email address to the clipboard.
- [ ] Pass / [ ] Fail: The Lead Contact Card settings tab renders correctly with the live preview card.
- [ ] Pass / [ ] Fail: Saving the Lead Contact Card settings persists the data to Firestore.
- [ ] Pass / [ ] Fail: The live preview card updates in real-time as the recruiter types in the settings form.
- [ ] Pass / [ ] Fail: The wildcard accordion opens and closes correctly.
- [ ] Pass / [ ] Fail: Category-specific content fields appear only if the recruiter has `coveredCategories` set on their profile.

---

## 10. Lead Submission (End-User Journey)

- [ ] Pass / [ ] Fail: A candidate submitting their details via a lead contact card triggers the `/api/user/leads/submit` endpoint.
- [ ] Pass / [ ] Fail: A lead document is created in the `leads` Firestore collection.
- [ ] Pass / [ ] Fail: The recruiter receives a new-lead notification email at their `inboundEmail` address (or account email if not set).
- [ ] Pass / [ ] Fail: The candidate receives a confirmation email.
- [ ] Pass / [ ] Fail: Submitting a lead with a missing name, email, or `recruiterId` returns a 400 error.
- [ ] Pass / [ ] Fail: Submitting a lead to a non-existent `recruiterId` returns a 404 error.

---

## 11. Recruiter Profile

- [ ] Pass / [ ] Fail: The profile page loads with the recruiter's existing data pre-populated.
- [ ] Pass / [ ] Fail: Covered categories can be added and removed; saving persists to Firestore.
- [ ] Pass / [ ] Fail: The inbound email field updates and saves independently.
- [ ] Pass / [ ] Fail: The billing country selector updates Firestore and persists on page reload.
- [ ] Pass / [ ] Fail: **[BUG — currently broken]** If `saveProfileCategories` fails, an error toast is shown — NOT a `alert()` dialog.
- [ ] Pass / [ ] Fail: Partner discount badges appear when `basicDiscount` or `exclusiveDiscount` > 0 on the profile.

---

## 12. Navigation & Auth Guard Edge Cases

- [ ] Pass / [ ] Fail: An unauthenticated user visiting `/recruiter/dashboard` is redirected to `/recruiter/login`.
- [ ] Pass / [ ] Fail: A recruiter with `requiresPasswordChange: true` visiting `/recruiter/territories` is redirected to `/recruiter/profile`.
- [ ] Pass / [ ] Fail: A standard (non-recruiter) user visiting `/recruiter/dashboard` is redirected to `/recruiter/login`.
- [ ] Pass / [ ] Fail: The logout button in the navigation bar ends the session and redirects to the recruiter login page from any page.
- [ ] Pass / [ ] Fail: After logout, navigating back (browser back button) does not restore the authenticated session.
- [ ] Pass / [ ] Fail: The `__session` cookie is cleared correctly on logout.

---

## 13. Mobile UX

- [ ] Pass / [ ] Fail: The mobile navigation menu opens and closes correctly on small screens.
- [ ] Pass / [ ] Fail: The logout button appears as the last item in the mobile nav menu.
- [ ] Pass / [ ] Fail: The Request Access modal is fully usable on a mobile device (fields not obscured by keyboard).
- [ ] Pass / [ ] Fail: The territory list view scrolls correctly on mobile without horizontal overflow.
- [ ] Pass / [ ] Fail: The schedule matrix step is usable on tablet (≥768px) screens.

---

## 14. Admin Recruiter Panel

- [ ] Pass / [ ] Fail: The admin recruiters table loads all recruiters and shows their status correctly.
- [ ] Pass / [ ] Fail: The "Refresh List" button reloads the table data.
- [ ] Pass / [ ] Fail: Territories, categories, and invoice amounts display correctly in the table rows.
- [ ] Pass / [ ] Fail: Status column correctly differentiates between "Requested", "Rejected", "Verified", and "Pending" states.
