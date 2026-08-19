## 1. Restore page size

- [ ] 1.1 In `app/composables/useMicroData.ts:89`, change `hitsPerPage: 100` back to `hitsPerPage: 1000` (or implement pagination if 1000 is later found insufficient for `utils/locations/uk.ts`'s ~400 entries plus headroom).
- [ ] 1.2 Confirm `app/composables/useMacroData.ts:72` still uses `hitsPerPage: 1000`; add a short comment on both call sites noting they must stay in sync, or add a shared constant both composables import.

## 2. Regression coverage

- [ ] 2.1 Add a test in `app/composables/tests/useMicroData.spec.ts` that mocks an occupation present in more than 100 UK regions and asserts all matching regions are returned (not an arbitrary subset).
- [ ] 2.2 Add a spec test pinning `microRegionalData` for a known occupation/region pair so a future change to the regional filter or page size is caught by CI.

## 3. Manual verification

- [ ] 3.1 Search a common role in a low-population UK region and confirm regional data is returned rather than falling back to national data.

## 4. Verification

- [ ] 4.1 Run local verification `pnpm vitest run`.
