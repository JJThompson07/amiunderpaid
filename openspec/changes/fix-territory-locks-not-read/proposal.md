## Why

The Phase 4 denormalisation moved territory lock documents from `territory_claims` to `territory_category_owners`. Both writers (`server/api/stripe/webhook.post.ts`, `server/api/stripe/cancel-territory.post.ts`) and the server-side card lookup (`server/api/user/search/recruiter-card.get.ts`) were updated to the new collection, but the client-side availability query in `app/composables/useTerritoryClaims.ts:31` was left reading the old, now-unwritten collection. `claimsData` therefore always resolves empty, `globalTakenMonths` is always `{}`, and every exclusive month on every territory renders as available to every recruiter — including months another recruiter has already paid up to £300/month/territory for. This is the audit's sole formally Critical finding and the only thing capping the reported score at 65 instead of 84.

Repointing the query alone is not sufficient: `territory_category_owners` has no rule in `firestore.rules`, so the deny-by-default posture blocks the client read even after the query is fixed. Both halves have to land together.

## What Changes

- Point `useTerritoryClaims.ts` at `territory_category_owners` instead of `territory_claims`.
- Add a `firestore.rules` block for `territory_category_owners` (authenticated read, server-only write), replacing the now-dead `territory_claims` block.
- Migrate existing `territory_claims` documents into `territory_category_owners`. The old collection is left in place, unwritten and unread by application code (rules for it are still removed), for a burn-in period before a follow-up change deletes it — see Risk note below.
- Add a round-trip test proving a lock written by the webhook path is visible to `useTerritoryClaims` — the test that would have caught this defect originally.
- Clean up the stale `territory_claims` references: the comment in `cancel-territory.post.ts:135` and the `territory-cancellation-integrity` spec (handled by this change's spec delta).

## Scope

`app/composables/useTerritoryClaims.ts`, `firestore.rules`, `tests/firestore.spec.ts`, a one-off migration script/task for existing `territory_claims` documents, and the stale comment/spec references.

## Non-Goals

- Changing the shape of the lock document itself (`takenExclusiveMonths`, `basicOwners`) — only which collection it lives in and is read from.
- Ticket 2 (refund-on-conflict) is a separate proposal; this change only restores the exclusivity check, it does not touch webhook conflict handling.

## Capabilities

### Modified Capabilities

- `territory-cancellation-integrity`: corrects the stale `territory_claims` requirement to reflect the actual `territory_category_owners` collection and adds a requirement that the client availability query stays in sync with the server-write collection.

### New Requirements (existing capability)

- `firestore-rules`: adds the missing rule block for `territory_category_owners`.

## Impact

- **Affected code:** `app/composables/useTerritoryClaims.ts`, `firestore.rules`, `server/api/stripe/cancel-territory.post.ts` (comment only), `tests/firestore.spec.ts`, `app/composables/tests/useTerritoryClaims.spec.ts`.
- **Data migration:** one-time backfill of `territory_category_owners` from `territory_claims`, dry-run and diffed against a production export before running live. The old collection is deleted only in a later follow-up change, after a burn-in period, since the migration is otherwise an irreversible action on production data.
- **Risk:** until this lands, every exclusive month on every territory is sellable more than once; see the paired proposal `fix-territory-conflict-refund` for what currently happens when that occurs.
