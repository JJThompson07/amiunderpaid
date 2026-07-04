## Context

This change is a defensive hardening pass — not a feature. It addresses bugs discovered during architectural review
before automated test authoring begins. Each fix is isolated and surgical; no breaking API changes are introduced.

## Goals / Non-Goals

**Goals:**

- Fix the `territory_claims` orphaned lock bug so that cancelled exclusive months become available to other recruiters.
- Standardise error feedback to use the platform toast system instead of `alert()`.
- Make the approval email multi-tenant aware.
- Add a rejection notification email.
- Remove the orphaned `signup()` direct-registration path.
- Expose a UI hint when the 10-territory Firestore `in` query limit is reached.
- Remove the optimistic local mutation from the cancel flow.
- Document the band-storage gap and add a fallback warning.

**Non-Goals:**

- Leads table pagination / virtualisation (separate performance change).
- Mobile keyboard / safe-area modal fixes (separate UX pass).
- Webhook `invoice.payment_succeeded` handling (separate resilience change).
- Stripe subscription billing correction for exclusive-only cancellations.

## Decisions

### Decision 1: Territory Claims Cleanup Strategy

When `cancel-territory.post.ts` cancels a territory:

- **Current**: Only modifies `activeTerritories` on the user document.
- **Fix**: After filtering `updatedTerritories`, build a list of months that are being removed (`removedMonths`). For each removed exclusive month in `territory_claims`, use a `FieldValue.delete()` map update to surgically remove only the cancelled user's entries. If the resulting `takenExclusiveMonths` map is empty, delete the entire `territory_claims` document.
- **Why not a full document replace?** Multiple recruiters can hold different months on the same claim doc. A replace would overwrite other users' data.

### Decision 2: Remove Optimistic Cancel UI Mutation

The `dashboard.vue` currently does:

```js
userProfile.value.activeTerritories = userProfile.value.activeTerritories.filter(...)
```

Since `userProfile` is backed by a VueFire `useDocument` reactive listener, this mutation is immediately overwritten by the next Firestore snapshot (within ~200–500ms), causing a visual flicker.

**Fix**: Remove the optimistic mutation entirely. The real-time listener will update the UI automatically after the server write completes. Show `isCancelling` state on the button instead.

### Decision 3: Multi-Tenant Email URL

The approval email URL should use the runtime config base URL (already computed in `create-checkout.post.ts`) rather than the hardcoded `.co.uk` domain. Since server handlers don't have the request context at email send time, we'll store the base URL in runtime config or pass it through the admin request header.

### Decision 4: Replace `alert()` with `showToast()`

The `useSystemToast` composable is already imported in both affected pages. Replacing `alert()` is a direct one-line swap.

## Risks / Trade-offs

- `territory_claims` cleanup: If a batch write fails mid-flight, the user's `activeTerritories` array and the `territory_claims` document could diverge. **Mitigation**: Use Firestore batch writes to make both operations atomic.
- Real-time listener for cancel: Without an optimistic update, there's a brief window (< 1s) where the button appears to do nothing. **Mitigation**: Keep `isCancelling` spinner running until the listener pushes the update.
