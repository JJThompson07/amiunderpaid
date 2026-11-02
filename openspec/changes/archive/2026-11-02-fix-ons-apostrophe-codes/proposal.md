## Why

The ONS ASHE 2026 tables (14.7a, 7.7a) store their `Code` cells as text with a literal leading apostrophe (`'2134`, `'E12000003`). The seeder copied codes verbatim. Verified live on 2026-11-02:

- 480 of the 481 UK 2026 national records and all 389 UK 2026 regional records carry `'`-prefixed `id_code`s.
- USA codes are clean.

The site looks up UK occupations by `id_code:<SOC>`, so `id_code:2134` matches only the 2025 record. UK 2026 occupation figures were loaded but never served, and UK results quietly mixed a 2025 occupation figure with the 2026 all-employees baseline.

## What Changes

- `shared/utils/govSpreadsheet.ts` strips leading apostrophes from codes (`parseCode`), and a code that is only an apostrophe becomes `undefined`. Tested.
- Post-merge data fix: re-upload UK 2026 national (14.7a) and regional (7.7a). Seeded IDs are built from country, location, title, year and period, not the code, so the re-upload overwrites the same records in Firestore and Algolia with corrected codes and creates no duplicates.

## Capabilities

### Modified Capabilities

- `government-data-seeder`: codes are normalised on parse.
