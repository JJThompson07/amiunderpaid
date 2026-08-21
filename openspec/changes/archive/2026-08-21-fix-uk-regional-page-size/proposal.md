## Why

The UK regional Algolia filter fix in `app/composables/useMicroData.ts:69` (appending the SOC code to `baseRegionalFilter`) is correct and finally makes the regional query selective. The same change dropped `hitsPerPage` from 1000 to 100 (`useMicroData.ts:89`). `utils/locations/uk.ts` carries roughly 400 ONS location entries, so for any occupation present in more than 100 regions, which 100 come back is arbitrary — a filter-only query with an empty search string has no meaningful ranking. `app/composables/useMacroData.ts:72` still uses 1000 against the same index, so the two composables are now inconsistent with each other.

`microRegionalData` is nondeterministically null for users whose region falls outside the returned slice; they silently fall back to normalised national data, producing a different and less accurate percentile — and the same user searching the same role can get different results on different requests as the index re-sorts. `microRegionalData` is the highest-weighted input to the MCA score, so this bug moves the headline number the product exists to produce, with no test currently pinning the correct value.

## What Changes

- Restore `hitsPerPage` to 1000 in `useMicroData.ts:89` (or paginate to retrieve all matching regions if 1000 is ever insufficient).
- Bring `useMicroData` and `useMacroData` to a consistent page size against the regional index, or document in a comment why they intentionally differ.
- Add a spec/test that pins `microRegionalData` for a known UK occupation and region, so this filter cannot silently move every UK user's score again undetected.

## Scope

`app/composables/useMicroData.ts`, `app/composables/useMacroData.ts` (page-size consistency only), and their test suites.

## Non-Goals

- Any further change to the SOC-code filter logic itself — that fix is already correct and out of scope here.
- Re-deriving or re-validating the MCA scoring formula.

## Capabilities

### New Capabilities

- `regional-benchmark-data`: defines the completeness and determinism requirements for the UK regional benchmark query that `microRegionalData` depends on.

## Impact

- **Affected code:** `app/composables/useMicroData.ts`, `app/composables/useMacroData.ts`, plus their spec/test files.
- **User-facing effect:** every UK user's `microRegionalData`, and therefore the score shown for occupations spanning more than 100 regions, becomes deterministic instead of varying between requests.
