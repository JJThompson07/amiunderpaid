## 1. Real refund on conflict

- [x] 1.0 **Pre-flight:** `amiunderpaid.com` verified in Resend via the Vercel DNS integration on 2026-08-21; confirmed with a real test send (`alerts@amiunderpaid.com` → `support@amiunderpaid.com`, email id `8b4aa19f-8ff9-4777-967a-ea10511d0141`). Remaining: set `RESEND_API_KEY` in the deployed (production) environment, not just locally — it's currently only in the local `.env`.
- [x] 1.1 In `server/api/stripe/webhook.post.ts`, implement `queueRefundAndAlert` to call `stripe.refunds.create({ payment_intent: session.payment_intent })` when `session.mode === 'payment'`, or `stripe.subscriptions.cancel(session.subscription)` when the conflict arose on a subscription checkout.
- [x] 1.2 If the refund call itself fails (e.g. already refunded, payment_intent missing), fall through to the alert path rather than throwing unhandled.
- [x] 1.3 Send an alert via email (Resend, to `support@amiunderpaid.com`) whenever an automated refund was not issued, so a human is notified within minutes.

## 2. Event dedup atomicity

- [x] 2.1 Move the `seen` marker write out of the post-transaction `await seen.set(...)` calls and into the `db.runTransaction` block using `t.create(seen, { ... })`, so a duplicate concurrent delivery of the same event ID fails the transaction with an "already exists" error instead of racing past the earlier `seen.get()` check.
- [x] 2.2 Ensure the conflict-path `seen.set({ outcome: 'conflict', ... })` write also happens via the transaction (or a follow-up write keyed off the same `t.create()`), so the `stripe_events` doc records the conflict outcome even when fulfilment throws.

## 3. Tests

- [x] 3.1 Add unit tests in `server/api/stripe/tests/webhook.spec.ts` covering: valid signature, invalid signature, duplicate event ID (second delivery short-circuits), and a month conflict that asserts `stripe.refunds.create` (or `subscriptions.cancel`) was called.
- [x] 3.2 Add a test asserting the `stripe_events` document records `outcome: 'conflict'` after a territory conflict.

## 4. End-to-end verification

- [ ] 4.1 Exercise the conflict path once against Stripe test mode (two simultaneous checkouts for the same exclusive month) and confirm the refund appears in the Stripe test dashboard.
- [ ] 4.2 For the first real conflicts this handles in production, have a human confirm the refund/alert fired correctly before treating the automated path as fully trusted — this moves real customer money, so don't rely solely on test-mode coverage before it's proven against a handful of live conflicts.

## 5. Verification

- [x] 5.1 Run local verification `pnpm vitest run`.
