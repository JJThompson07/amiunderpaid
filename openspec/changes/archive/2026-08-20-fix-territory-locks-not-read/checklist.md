# Manual follow-up checklist

All code, tests, and specs for this change are done and merged (tasks 1-3, 4.1,
5, and 6.2 in `tasks.md`). What's left needs a human with production access —
tracked here so the change could be archived without losing them.

## Production migration (tasks 4.2-4.4) — not needed

Confirmed by the user (2026-08-20): `territory_claims` no longer exists in
production Firestore — it was cleared when test recruiters were cleaned up
before going live. There is nothing for `scripts/migrate-territory-claims.ts`
to migrate, so tasks 4.2 (dry-run against a prod export), 4.3 (run for real),
and 4.4 (burn-in before deletion) are moot. The script is left in `scripts/`
for reference in case a similar situation ever recurs, but no action is
needed here.

## Manual verification (task 6.1)

- [ ] With two test accounts: recruiter A buys an exclusive month, then
      recruiter B opens the territory schedule matrix and confirms that month
      renders greyed out and cannot be selected.
