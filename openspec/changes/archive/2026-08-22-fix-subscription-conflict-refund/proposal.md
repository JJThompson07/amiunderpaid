## Why

`server/api/stripe/webhook.post.ts:63-64` handles a territory conflict on a subscription-mode checkout session by cancelling the subscription only — it never refunds money already collected. `stripe.subscriptions.cancel` stops future billing; it does not return past charges. This is not an edge case: `create-checkout.post.ts:285` puts any cart with `basicCount > 0` into subscription mode, and exclusive-month charges are added to that same session as a one-off line item (`create-checkout.post.ts:199-216`). So "some basic territories plus some exclusive months" — a common cart — is a subscription-mode session carrying a real upfront charge. The sharpest case is `basicDiscount: 100`: no trial, so the first invoice (including the full upfront amount) is charged immediately, and a conflict then cancels a £0/mo subscription while keeping the money.

The current `stripe-checkout-security` spec explicitly sanctions this ("an automated refund (or subscription cancellation) where the payment shape supports it"), so the defect must be corrected in the spec and the code together.

## What Changes

- On the subscription conflict branch in `queueRefundAndAlert`, refund the session's first invoice payment intent (when something was actually paid) in addition to cancelling the subscription. Refund before cancel, so a refund failure leaves the subscription live and recoverable rather than cancelled-and-unrefunded.
- Correct the `stripe-checkout-security` spec's "Safe conflict retries" requirement so it demands a refund of collected funds, not cancellation as a substitute.
- Update `webhook.spec.ts`'s subscription-conflict test to assert a refund + cancel, rename it, and add a zero-`amount_paid` (trialling) case that cancels without refunding and without alerting.
- Fold in: reset `territoryConflict` at the start of each transaction attempt in `webhook.post.ts` (currently declared at `:122` outside `db.runTransaction` and assigned at `:252` inside it), so a conflict on a retried attempt whose earlier try aborted doesn't fire a refund against a purchase that ultimately succeeded. This is in the exact function this change already has open, and is a real money-losing-the-other-direction bug (refunding a customer who was correctly fulfilled).

## Non-Goals (see also proposal Scope below)

- Preventing the conflict from arising (availability display / checkout-time validation) — covered by `territory_category_owners` work.
- Changing the return-200-so-Stripe-stops-retrying decision — already correct and specified.
- Partial refunds proportional to conflicting months — refund the whole session; a partial-refund model needs its own change.
- **Deferred, not folded in**: recording `refundStatus` on the `stripe_events` dedup marker and retrying an unrefunded conflict on redelivery (audit item 2). This needs a new persisted field, a schema decision, and fast-path retry logic — a materially larger change than fixing the refund bug this proposal targets. It's a real gap (a crash between the transaction commit and the refund attempt at `:300` currently means Stripe's dedup short-circuit permanently skips the refund), but it belongs in its own change so this one stays scoped to "the subscription branch doesn't refund." Tracked as a follow-up (e.g. `fix-refund-idempotency-tracking`).

## Capabilities

### Modified Capabilities

- `stripe-checkout-security`: the "Safe conflict retries" requirement changes from permitting subscription cancellation as a refund substitute to requiring an actual refund of collected funds, with cancellation as an additional (not alternative) step.

## Impact

- **Affected code:** `server/api/stripe/webhook.post.ts` (`queueRefundAndAlert` at `:49-83`, and the `territoryConflict` reset in the transaction callback), `server/api/stripe/tests/webhook.spec.ts`.
- **Affected spec:** `openspec/specs/stripe-checkout-security/spec.md`.
- **User-facing effect:** recruiters whose subscription-mode purchase hits a territory conflict get their money back automatically instead of only losing future billing. No effect on the one-off-payment refund path, which already works correctly.
- **Operational effect:** issues real Stripe refunds (irreversible, moves money) — pre-flight verification against Stripe test mode is required before implementation, not after (see `tasks.md`).
