## Context

`queueRefundAndAlert` in `server/api/stripe/webhook.post.ts:49-83` is the single place that reacts to a territory conflict detected during fulfilment. It already branches on `session.mode`, already runs inside a `try` whose catch sets `refundError` and triggers `sendHumanAlert`, and already has a working one-off-payment refund branch. The change is isolated to the `else if (session.subscription)` branch and its test.

`session.subscription` is just an ID — it doesn't say whether anything was actually charged. A trialling subscription's first invoice can be £0 with no payment intent. The implementation must retrieve the subscription, find its first invoice's payment intent, and only refund when that invoice actually collected money.

**Pre-flight finding (task 1, verified against Stripe test mode on API version `2026-03-25.dahlia` — see task 1 for the full record):** `Invoice.payment_intent` does not exist on this API version; it was removed in favor of the Invoice Payments API. `stripe.invoices.retrieve(id, { expand: ['payment_intent'] })` (or the nested `subscription.latest_invoice.payment_intent` expand path the audit's sample code used) resolves to `undefined`, not a string ID and not an error — so an implementation built against that field does not throw, it silently never refunds anything. The real payment reference is `stripe.invoicePayments.list({ invoice: <invoice.id> }).data[0].payment.payment_intent`, confirmed against real paid and £0 invoices below. This finding **replaces** the audit's original design-note code sample; see Decisions below for the corrected approach.

## Goals / Non-Goals

**Goals:**

- A subscription-mode conflict refunds whatever was actually collected, then cancels the subscription.
- A trialling (£0 first invoice) subscription-mode conflict cancels without attempting a refund, and this is not treated as a failure requiring a human alert.
- A partial failure (refund throws) leaves the account in a state ops can finish by hand, not a state where the subscription is already gone and unrecoverable.
- Fix `territoryConflict` leaking across a retried transaction attempt, since it lives in the same function this change already touches and is a related money-safety bug (refunding a customer whose purchase actually succeeded).

**Non-Goals:**

- Recording refund state on the `stripe_events` dedup marker, or retrying an unrefunded conflict on webhook redelivery. Deferred to a follow-up change (see proposal Non-Goals).
- Partial/proportional refunds.
- Changing anything on the one-off-payment (`session.mode === 'payment'`) branch, which already works correctly and is checked first — a subscription-mode session never reaches it.

## Decisions

### Refund before cancel

Both Stripe calls stay inside the existing single `try` at `:57`. Ordering the refund first means: if the refund call throws, the subscription is still live — a consistent (if wrong-for-now) state that ops can resolve by hand from the Stripe dashboard. If cancel ran first and refund then failed, the customer would have no subscription and no money back, with nothing left for ops to act on except the alert. Refund-then-cancel is strictly the safer failure mode.

**Alternative considered:** cancel-then-refund, matching the code's current call order. Rejected — it produces the worse failure state described above for no benefit; nothing depends on cancel happening first.

### Guard on `invoice.amount_paid > 0`, not on invoice existence

A trialling subscription can have a `latest_invoice` that exists but collected nothing. The relevant question is "was money collected," not "does an invoice exist." Verified in test mode: a £0 trial-only invoice has `status: 'paid'` (a $0 invoice is trivially payable) and `amount_paid: 0`, with `stripe.invoicePayments.list` returning an empty array — so `amount_paid > 0` is the correct signal, not invoice existence or status.

Skipping the refund in this case must **not** set `refundError` / trigger `sendHumanAlert` — cancelling a subscription that never charged anything is the fully-correct outcome, not a degraded one.

### Retrieve the payment intent via the Invoice Payments API, not `invoice.payment_intent`

**Corrected from the audit's original code sample** based on the task 1 pre-flight finding above. `Invoice.payment_intent` doesn't exist on this account's pinned API version (`2026-03-25.dahlia`); the field is `undefined` even on a fully-paid invoice, expanded or not. The actual implementation:

```ts
} else if (session.subscription) {
  const sub = await stripe.subscriptions.retrieve(session.subscription as string, {
    expand: ['latest_invoice']
  });
  const invoice = sub.latest_invoice as Stripe.Invoice | null;

  // Refund BEFORE cancelling: see ordering rationale below.
  if (invoice && invoice.amount_paid > 0) {
    const payments = await stripe.invoicePayments.list({ invoice: invoice.id });
    const paymentIntentId = payments.data[0]?.payment?.payment_intent;
    if (typeof paymentIntentId === 'string') {
      await stripe.refunds.create({ payment_intent: paymentIntentId });
    } else {
      // amount_paid > 0 with no resolvable payment intent is the genuine
      // anomaly case (not the expected trial path) — let it fall through to
      // the outer catch so it alerts, rather than silently cancelling.
      throw new Error(`Invoice ${invoice.id} has amount_paid > 0 but no invoice payment record`);
    }
  }

  await stripe.subscriptions.cancel(session.subscription as string);
}
```

Confirmed against real test-mode data for both the paid case (`invoicePayments.list` returns one `invoice_payment` with `payment.payment_intent` set to a real `pi_...` ID) and the £0 trial case (empty array, never reached because of the `amount_paid > 0` guard).

### `territoryConflict` reset: reset the closure variable, not a `runTransaction` return value

`db.runTransaction`'s callback can be re-invoked by the Firestore client on retryable errors (e.g. contention). `territoryConflict` is declared once outside the callback and never reset, so a conflict recorded on attempt 1 survives into a successful attempt 2, and the post-transaction code at `:291` still fires a refund against a purchase that actually succeeded on the retry.

Fix: assign `const result = await db.runTransaction(...)` where the callback returns a discriminated outcome (`{ conflict: false } | { conflict: true; error: Error }`) instead of writing to an outer closure variable, and read the conflict flag from `result` after the call. This removes the possibility of stale closure state entirely, rather than remembering to reset a flag at the top of the callback (which would still be correct, but is one more manual invariant to maintain in a function that's already deeply nested).

**Alternative considered:** reset `territoryConflict = null` as the first line of the callback. Simpler diff, but leaves a mutable closure variable as the source of truth for something Firestore may invoke multiple times — a return-value approach is the more direct fix for exactly that failure mode. Given this bug's root cause is closure state surviving a retry, prefer removing the closure state.

## Risks / Trade-offs

- **[Risk] The pre-flight assumption about `amount_paid` timing could be wrong** (e.g. Stripe might defer invoice finalization such that `latest_invoice` isn't populated synchronously at the point the webhook fires) → Mitigated by the mandatory pre-flight verification task (task 1) against Stripe test mode before any code changes, observing the real `amount_paid` value for both the trial and no-trial cases. The implementation branches on exactly this value, so it must be observed, not assumed.
- **[Risk realized] The audit's original code sample used `invoice.payment_intent`, which doesn't exist on this account's Stripe API version** → this is precisely the failure mode the pre-flight task exists to catch: an implementation that looks correct, compiles, and would pass a naively-mocked test, but never actually refunds anything against real Stripe because the field it reads is always `undefined`. Caught during task 1 before any code was written; the design and task 2.1 now specify the Invoice Payments API instead. This is the strongest evidence in this change that pre-flight-before-irreversible-task ordering (not pre-flight-as-an-afterthought) is the right call.
- **[Risk] Refunding is irreversible** — a refund issued in error can't be undone by re-running the webhook → Mitigated by the `amount_paid > 0` guard being the only gate (matches the one-off-payment branch's existing risk profile, which already issues real refunds) and by keeping the refund-before-cancel ordering so a wrongly-triggered refund attempt that fails leaves state recoverable.
- **[Trade-off] `territoryConflict` refactor touches transaction-outcome plumbing beyond the refund bug** → Accepted because it's the same function, a related money-safety bug, and the audit explicitly flagged it as arguably the more urgent of the two related items; the dedup-marker tracking item was excluded from this change specifically to keep total blast radius bounded.

## Migration Plan

No data migration. This is a pure behavior change in a webhook handler; no schema changes, no backfill. Deploy as a normal PR merge. Rollback is a plain revert — no state written by the old behavior needs cleanup beyond what ops already handles manually today for unrefunded conflicts.

## Open Questions

- Exact `amount_paid` behavior for the no-trial, 100%-discounted case is unverified from source and is resolved by the pre-flight task, not left open into implementation.
