## 1. Root cause confirmation

- [x] 1.0 **Pre-flight:** confirmed the bug is real and deterministic, not theoretical, by reading the actual `@google-cloud/firestore` Transaction implementation in `node_modules` — `get`/`getAll` throw `READ_AFTER_WRITE_ERROR_MSG` whenever `_writeBatch` is non-empty, and `create`/`set` populate `_writeBatch` synchronously. Confirmed the regressed order was on `main` as of commit `3883a42` (2026-08-21), already archived under `fix-territory-conflict-refund`.

## 2. Fix operation order

- [x] 2.1 In `server/api/stripe/webhook.post.ts`, move `t.create(seen, ...)` to after `t.get(userRef)` and `t.getAll(...refsArray)`, so all reads precede all writes in the transaction.

## 3. Test hardening

- [x] 3.1 In `server/api/stripe/tests/webhook.spec.ts`, wrap `mockTransaction` so `get`/`getAll` throw the real SDK's `READ_AFTER_WRITE_ERROR_MSG` once `set`/`create` has been called within the same transaction invocation, without changing how existing tests configure or assert against `mockTransaction`.
- [x] 3.2 Verified the hardened mock actually catches the regression: temporarily reverted the operation-order fix and re-ran the suite — 4/8 tests failed with `Database fulfillment failed`, matching the production symptom. Restored the fix; all 8 pass.

## 4. Verification

- [x] 4.1 Ran the full suite: spellcheck (302 files, 0 issues), `nuxt typecheck` (clean), `prettier --check` (clean except the pre-existing, untracked, gitignored `.claude/settings.local.json`, unrelated to this change), `structure-lint` (clean), `check-standards` (clean), `eslint --max-warnings 0` across the whole repo (clean, after fixing one `curly` violation introduced by the hardened mock and reconciling it with `prettier --write`), `pnpm vitest run` (353/353 passed, 53 files), `pnpm test:e2e` (20/20 Playwright passed: chromium, firefox, ssr).
- [x] 4.2 Ship as a hotfix ahead of other in-flight feature work, given every paid checkout is currently failing fulfilment on `main`.
