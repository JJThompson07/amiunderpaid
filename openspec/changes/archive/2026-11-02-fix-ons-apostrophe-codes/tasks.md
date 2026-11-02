## 1. Pre-flight verification

- [x] 1.1 Confirm the scope live: 480/481 UK 2026 national and 389/389 UK 2026 regional records have `'`-prefixed codes; USA 2026 has none; `country:UK AND year:2026 AND id_code:2134` returns 0 hits, while 2025 returns 1.
- [x] 1.2 Confirm the re-upload is non-duplicating: seeded doc IDs / `objectID`s are `${country}-${location}-${title}-${year}-${period}` and do not include the code.

## 2. Fix

- [x] 2.1 Add `parseCode` to `shared/utils/govSpreadsheet.ts` (trim and strip leading apostrophes; empty becomes `undefined`) for both UK and USA codes, with a test covering national and regional ONS 2026-style codes.
- [x] 2.2 Run `pnpm test:verify` and confirm it passes in full.

## 3. Post-deploy (manual)

- [ ] 3.1 Re-upload UK 2026 national (ASHE 14.7a) and regional (ASHE 7.7a), back to back.
- [ ] 3.2 Confirm `country:UK AND year:2026 AND id_code:2134` returns the 2026 Programmers record, and that no UK 2026 codes start with `'`.
