## 1. Discovery

- [x] 1.1 Create `server/api/admin/adzuna-locations.get.ts`. This admin-only endpoint should: read Adzuna credentials from `useRuntimeConfig()`, call the Adzuna API with a broad UK search (e.g., `https://api.adzuna.com/v1/api/jobs/gb/geodata` with `location0=UK`, or a search endpoint inspecting the `area` arrays), extract the unique `area[1]` region-level strings, and return them as a JSON array.
- [x] 1.2 Run the dev server (`pnpm dev`) and hit the discovery endpoint to capture the exact region names returned by Adzuna for `location0=UK`.
- [x] 1.3 Record the verified region names.

### Verified Adzuna UK Region Names (captured 2026-06-28)

```
East Midlands
Eastern England
London
North East England
North West England
Northern Ireland
Scotland
South East England
South West England
Wales
West Midlands
Yorkshire And The Humber
```

## 2. Update Mapping

- [x] 2.1 Update `server/constants/locations.ts` to replace all guessed values with the exact strings returned by the discovery endpoint. Every value in `ADZUNA_LOCATION_MAP` must match one of the verified region names.
- [x] 2.2 If any of our internal slugs don't have a corresponding Adzuna region (or vice versa), document the gap as a comment in the file.

### Corrections Made

| Slug                       | Old (guessed)              | New (verified)             |
| -------------------------- | -------------------------- | -------------------------- |
| `east`                     | `East of England`          | `Eastern England`          |
| `yorkshire-and-the-humber` | `Yorkshire and The Humber` | `Yorkshire And The Humber` |

All other 10 values were already correct.

## 3. Cleanup

- [x] 3.1 Decide whether to keep or remove the discovery endpoint. If kept, ensure it is behind admin auth (`verifyAdmin(event)`). If removed, delete the file.

**Decision:** Kept. The endpoint is behind `verifyAdmin(event)` and useful for future taxonomy audits.

## 4. Verification

- [x] 4.1 Run `pnpm format` and confirm zero formatting changes needed.
- [x] 4.2 Run `pnpm eslint .` and confirm 0 new errors introduced.
- [x] 4.3 Run `pnpm nuxi typecheck` and confirm no new TypeScript errors.
