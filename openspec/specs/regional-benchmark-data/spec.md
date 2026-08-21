# regional-benchmark-data Specification

## Purpose

Defines the completeness and determinism requirements for the UK regional benchmark query that `microRegionalData` depends on.

## Requirements

### Requirement: UK regional query returns all matching regions

The UK regional benchmark query in `useMicroData` SHALL retrieve every region matching the current occupation and category filter, not an arbitrary subset. `useMicroData` and `useMacroData` SHALL use a consistent page size against the shared regional Algolia index, or any deliberate difference SHALL be documented in a code comment explaining why.

#### Scenario: Occupation present in more than 100 UK regions

- **WHEN** a UK user searches an occupation that has data in more than 100 of the ~400 ONS regions in `utils/locations/uk.ts`
- **THEN** `microRegionalData` SHALL include the result for the user's own region if it exists in the index, deterministically across repeated requests

#### Scenario: Regional data exists for a low-population region

- **WHEN** a UK user in a low-population region searches a common occupation
- **THEN** the system SHALL return that region's data rather than silently falling back to normalised national data
