## 1. Client query and rules

- [x] 1.1 In `app/composables/useTerritoryClaims.ts:31`, change the query to `collection(db, 'territory_category_owners')`.
- [x] 1.2 In `firestore.rules`, remove the `match /territory_claims/{id}` block (`:52`) and add:
  ```
  match /territory_category_owners/{id} {
    allow read: if isAuthenticated();
    allow write: if false;
  }
  ```
- [x] 1.3 Update `app/composables/tests/useTerritoryClaims.spec.ts` so the mocked collection is `territory_category_owners`, not `territory_claims`.

## 2. Firestore rules test coverage

- [x] 2.1 In `tests/firestore.spec.ts`, add a case asserting an authenticated user can read `territory_category_owners`. — Verified against the real Firestore emulator (Java 21 installed via Homebrew for this), all 13 rules tests pass.
- [x] 2.2 Add a case asserting a client write to `territory_category_owners` is denied. — Same run.

## 3. Round-trip regression test

- [x] 3.1 Add a test (integration-style, using the Firestore emulator) that writes a lock via the webhook fulfilment path and asserts `useTerritoryClaims`'s query resolves it in `globalTakenMonths`. This is the test that would have caught the original defect. — Implemented in `tests/firestore.spec.ts` as a rules-test-harness round-trip: seeds a doc via `withSecurityRulesDisabled` exactly as the webhook's fulfilment transaction writes it (same doc ID shape, same fields), then reads it back using the exact query shape `useTerritoryClaims.ts` builds (collection + `territoryId in [...]`). Does not invoke the live Nitro webhook handler itself (that would need bootstrapping the `1.firebaseInit` Nitro plugin, which this repo's test infra doesn't currently support) — it validates the actual regression (reader/writer collection mismatch) via the same seeding pattern the rest of this file already uses for server-only collections.

## 4. Data migration

- [x] 4.1 Write a one-off migration script (e.g. `scripts/migrate-territory-claims.ts`) that copies every `territory_claims` document into `territory_category_owners` under the equivalent `{territoryId}_{categoryValue}` doc ID, merging rather than overwriting if a target doc already exists. Merge logic must not let a stale `territory_claims` field clobber a newer `territory_category_owners` write for the same key (e.g. Phase-4-era writes that only ever went to the new collection). — Written and verified end-to-end against the Firestore emulator with seeded create/merge/no-op cases (a create-only doc, a doc present in both with non-overlapping months, and a doc present in both where target's value should win on a conflicting key); dry-run output matched the real run exactly.
- [ ] 4.2 Before running against production, dry-run the migration against a copy/export of production data (or the Firestore emulator seeded from a production export) and diff document counts and lock contents between source and target. — Needs production data access; not done by the agent.
- [ ] 4.3 Run the migration against production data. Verify a known previously-sold month renders as unavailable in the purchase UI, and spot-check a sample of migrated documents against the original `territory_claims` source. — Needs a human with production Firestore access; not done by the agent.
- [ ] 4.4 Do NOT delete `territory_claims` in the same change. Leave it in place, unwritten and unread by application code, for a burn-in period (at least a few days of normal purchase/cancellation traffic) so there is a rollback source if a migration gap surfaces. Delete it in a small follow-up change once the burn-in period has passed without incident. — Tracked as a future follow-up change once burn-in has passed; not applicable until 4.3 has run.

## 5. Cleanup

- [x] 5.1 Remove the stale `territory_claims` comment at `server/api/stripe/cancel-territory.post.ts:135`.
- [x] 5.2 Update `openspec/specs/territory-cancellation-integrity/spec.md` per this change's spec delta. — Also updated `openspec/specs/firestore-rules/spec.md` per the delta's `firestore-rules` requirement. Both validated with `openspec validate`.

## 6. Verification

- [ ] 6.1 Manual check: with two test accounts, recruiter A buys an exclusive month, recruiter B sees that month greyed out and cannot select it. — Needs a human against the running app; not done by the agent.
- [x] 6.2 Run local verification `pnpm vitest run`. — 326/326 passing.
