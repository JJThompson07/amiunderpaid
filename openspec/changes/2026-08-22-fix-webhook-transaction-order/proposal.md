## Why

`fix-territory-conflict-refund` moved the `stripe_events` dedup marker write into the fulfilment transaction via `t.create(seen, ...)`, staged as the very first operation in `db.runTransaction` (`server/api/stripe/webhook.post.ts`, formerly `:147`), ahead of the pre-existing `t.get(userRef)` and `t.getAll(...refsArray)` reads (formerly `:155`/`:173`).

Firestore transactions require every read to be issued before any write is staged. The Node admin SDK enforces this at the client: `@google-cloud/firestore`'s `Transaction.get`/`getAll` throw `'Firestore transactions require all reads to be executed before all writes.'` the moment `_writeBatch` is non-empty. Because `t.create()` populates `_writeBatch` synchronously, the subsequent `t.get(userRef)` throws on literally every invocation — this isn't a race or an edge case, it fails 100% of the time.

That thrown error isn't an "already exists" error and doesn't match the `Territory ` conflict prefix, so it falls through both special-case catches into the generic handler, which returns a 500 with no refund queued. Net effect: **every `checkout.session.completed` webhook fails**, no customer receives their purchased territories, no refund is issued, and Stripe retries the failing delivery on its normal backoff (up to ~3 days) before giving up.

CI did not catch this because `server/api/stripe/tests/webhook.spec.ts` mocked the transaction as a plain object (`{ get, getAll, set, create }`, each an independent `vi.fn()`) with no ordering enforcement between them — unlike the real SDK, the mock accepted a write staged before a read.

## What Changes

- Reorder `server/api/stripe/webhook.post.ts` so `t.create(seen, ...)` is staged after `t.get(userRef)` and `t.getAll(...refsArray)`, restoring the read-before-write invariant Firestore requires.
- Harden the `mockTransaction` in `webhook.spec.ts` to throw the same `READ_AFTER_WRITE_ERROR_MSG` the real SDK throws once any write (`set`/`create`) has been staged and a `get`/`getAll` is subsequently called, so this regression class fails the test suite instead of passing silently.

## Scope

`server/api/stripe/webhook.post.ts` (transaction operation order only, no behavioral change beyond making fulfilment work again) and its test suite (mock fidelity).

## Non-Goals

- Changing what the transaction does — only the order of already-correct operations.
- Building a general Firestore-transaction-ordering lint/type check; the hardened mock is scoped to this test file.

## Capabilities

### Modified Capabilities

- `stripe-checkout-security`: adds an explicit requirement that the fulfilment transaction issues all reads before any write, since the existing "Atomic webhook event deduplication" requirement described _that_ the dedup marker is created inside the transaction but not _where_ relative to the reads — which is exactly the gap this regression exploited.

## Impact

- **Affected code:** `server/api/stripe/webhook.post.ts`, `server/api/stripe/tests/webhook.spec.ts`.
- **Behavioral change:** none intended — this restores the pre-regression behavior (successful fulfilment). The dedup-marker-creation semantics (atomic per-transaction create, "already exists" short-circuits concurrent deliveries) are unchanged, only its position within the transaction moves.
- **Production impact:** this is a live-fulfilment-breaking regression on `main` as of `3883a42` (2026-08-21). Treat as a hotfix — verify current deployed behavior before/while shipping (see `tasks.md` pre-flight).
