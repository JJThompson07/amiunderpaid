## Why

When the Stripe webhook detects that a purchased exclusive month is already owned, it correctly throws inside the fulfilment transaction (`server/api/stripe/webhook.post.ts:138`) and the catch block correctly distinguishes this business conflict from a transient failure, returning HTTP 200 so Stripe stops retrying. It then calls `queueRefundAndAlert`, which only logs — `server/api/stripe/webhook.post.ts:5-16` — no refund is issued and no alert reaches a human. The customer has been charged in full, receives no territory, and the only record is a `console.error` line nobody is watching. Before this behaviour existed, a conflict at least surfaced as a visibly failed 500 that Stripe kept retrying/surfacing; the current design is quieter and therefore worse specifically here.

This pairs with `fix-territory-locks-not-read`: that change makes conflicts common (client currently shows every month as available), and this change determines what happens to the customer when one occurs. It remains a real defect independent of that fix, because a genuine race between two simultaneous checkouts can still produce a conflict.

## What Changes

- Implement a real refund path in `queueRefundAndAlert`: `stripe.refunds.create({ payment_intent: ... })` for one-off charges, or subscription cancellation where the charge was a subscription.
- Where an automated refund is not viable for a given payment shape, raise an alert that reaches a human within minutes (any monitoring channel is acceptable), not just a log line.
- Record the conflict outcome on the `stripe_events` document so it is queryable after the fact, not only greppable in logs.
- Move the event-dedup marker creation into the fulfilment transaction (`t.create()`) so two concurrent deliveries of the same webhook event cannot both proceed past the `seen.get()` check.
- Add webhook unit tests: valid signature, invalid signature, duplicate event ID, and a month conflict asserting a refund was requested.

## Scope

`server/api/stripe/webhook.post.ts` only (refund logic, dedup marker placement, `stripe_events` outcome recording) plus its test suite.

## Non-Goals

- Fixing the underlying cause of conflicts (that is `fix-territory-locks-not-read`) — this change only fixes what happens once a conflict occurs.
- Building a general-purpose alerting/observability system; reusing whatever channel the team already has (email, Slack webhook, etc.) is sufficient.

## Capabilities

### Modified Capabilities

- `stripe-checkout-security`: replaces the "logs the conflict" language in the existing "Safe conflict retries" requirement with a concrete refund/alert obligation, and adds a requirement for atomic event deduplication.

## Impact

- **Affected code:** `server/api/stripe/webhook.post.ts`, its test file, and whatever monitoring/alert channel is chosen.
- **External dependency:** none new — `stripe.refunds.create` is already available via the existing `stripe` package.
- **Verification:** exercised once end-to-end against Stripe test mode with the refund confirmed in the Stripe dashboard, in addition to unit tests.
