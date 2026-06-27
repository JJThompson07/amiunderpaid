## Why

Before authoring automated tests, the codebase needs a thorough architectural and UX sanity pass to confirm all user journeys work end-to-end, edge cases are handled, and no critical data-integrity bugs exist. During this review, several concrete bugs and missing safeguards were discovered across the Firebase ↔ Stripe ↔ Firestore pipeline, the territory cancellation flow, the recruiter access request lifecycle, and the UI layer.

## What Changes

- **BUG FIX — Cancellation does not release territory_claims locks**: `cancel-territory.post.ts` filters the user's `activeTerritories` array but **never deletes or removes the corresponding `exclusiveMonths` entries** from `territory_claims`. This means cancelled months remain permanently locked for other recruiters, causing silent data corruption.
- **BUG FIX — Optimistic UI desync on territory cancel**: The dashboard's `executeCancel` method mutates `userProfile.value.activeTerritories` locally but the field is driven by a real-time `useDocument` listener. The optimistic mutation is immediately overwritten by the next Firestore snapshot, leaving the UI in an inconsistent flicker state.
- **BUG FIX — `accept.post.ts` uses a hardcoded UK login URL**: The approval email always links to `https://amiunderpaid.co.uk/recruiter/login`, breaking multi-tenant deployments for Benchmark My Role / US users.
- **BUG FIX — `reject.post.ts` sends no notification email**: A rejected recruiter receives no communication — they are silently rejected with no feedback.
- **BUG FIX — `cancel-territory.post.ts` does not cancel exclusive-only subscriptions**: When a recruiter holds exclusive months but no basic subscription, `stripeSubId` will be `undefined`, so the exclusive claim is stripped from Firestore but no Stripe state is touched. If there's any subscription associated, it leaks.
- **BUG FIX — Webhook `checkout.session.completed` only handles one event type**: A successful subscription produces both `checkout.session.completed` AND `invoice.payment_succeeded`. If Stripe retries a failed initial invoice, the webhook will silently ignore it, leaving the recruiter's territory un-fulfilled.
- **MISSING GUARD — `useTerritoryClaims` hardcoded 10-ID Firestore `in` limit**: The comment documents the 10-item limit but silently slices the array without warning the UI or the user. A recruiter selecting 11+ territories will have incomplete lock data shown in the matrix.
- **UX — Checkout error uses `alert()`**: `territories/index.vue:340` calls `alert('Something went wrong…')` — a blocking, unstyled browser dialog inconsistent with the app's toast notification system.
- **UX — `saveProfileCategories` uses `alert()` on error**: `profile.vue:465` also falls back to `alert('Failed to save categories…')`.
- **UX — Mobile keyboard interference on fixed modals**: Modals (e.g. `RequestAccess.vue`, `ModalGeneric`) use fixed positioning. On iOS Safari, the virtual keyboard causes the modal viewport to resize, pushing content behind the keyboard. No `env(safe-area-inset-*)` or `dvh` adjustments are applied.
- **UX — Leads table has no pagination or virtualisation**: `leads.vue` fetches and renders the entire leads collection via `useCollection`. For recruiters with thousands of leads this will cause severe performance degradation and long initial load times.
- **UX — Empty state for leads missing when `leadsPending` is false and collection is empty**: The `AmITable` component receives the empty-message prop, so this is partially handled, but the empty state icon/illustration is absent — visually sparse compared to the dashboard empty state.
- **DATA INTEGRITY — `request-access.post.ts` does not auto-generate a document ID matching the future Firebase Auth UID**: The document is added with `db.collection('users').add(...)` which generates a random Firestore ID. When `accept.post.ts` creates the Firebase Auth user with `uid: uid` (the Firestore doc ID), this works — but only because the admin passes back the Firestore document ID. If the document is later re-created or the IDs drift, the link breaks silently.
- **DATA INTEGRITY — `cancel-territory.post.ts` defaults all territories to `band 1` pricing**: Line 77 uses `t.band || 1`. If `band` was never stored on the `activeTerritories` array item (it is not written by the webhook), all cancellations recalculate as Band 1, potentially under- or over-billing the Stripe subscription update.
- **DATA INTEGRITY — `signup` in `useRecruiterAuth.ts` is dead code post-access-request flow**: The `signup()` function creates a recruiter account directly via `createUserWithEmailAndPassword`, bypassing the admin approval gate. This path should be removed or gated.

## Capabilities

### New Capabilities

None — this is a bugfix and defensive hardening change only.

### Modified Capabilities

- `recruiter-access-request`: Add rejection notification email; harden duplicate-document logic.
- `recruiter-profile-password-change`: No changes — password change flow is correct.

## Impact

- **`server/api/stripe/cancel-territory.post.ts`**: Requires addition of `territory_claims` lock cleanup logic.
- **`server/api/stripe/webhook.post.ts`**: Consider handling `invoice.payment_succeeded` for retry resilience.
- **`server/api/admin/recruiters/accept.post.ts`**: Replace hardcoded login URL with dynamic multi-tenant URL.
- **`server/api/admin/recruiters/reject.post.ts`**: Add notification email to rejected recruiter.
- **`app/pages/recruiter/territories/index.vue`**: Replace `alert()` with `showToast()`.
- **`app/pages/recruiter/profile.vue`**: Replace `alert()` with `showToast()`.
- **`app/composables/useTerritoryClaims.ts`**: Expose a `claimsLimitExceeded` flag when `territoryIds > 10`.
- **`app/pages/recruiter/dashboard.vue`**: Remove optimistic UI mutation after cancel — rely on Firestore real-time.
- **`app/composables/useRecruiterAuth.ts`**: Gate or remove `signup()` function.
