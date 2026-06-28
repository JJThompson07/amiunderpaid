# adzuna-taxonomy-sync Specification

## Purpose
TBD - created by archiving change adzuna-taxonomy-sync. Update Purpose after archive.
## Requirements
### Requirement: Adzuna API Location Adapter

The location adapter map in `server/constants/locations.ts` SHALL use strings that are verified against the actual Adzuna API taxonomy responses, not guessed values.

#### Scenario: Internal slug 'east' maps to the API-verified region name

- **WHEN** the API route receives a `location` query parameter of `"east"`
- **THEN** the adapter SHALL map it to the exact string returned by the Adzuna API for the eastern England region (to be confirmed by the discovery script — expected to be `"Eastern England"` or `"East of England"`).

#### Scenario: All mapped values are API-verified

- **WHEN** any slug in `ADZUNA_LOCATION_MAP` is looked up
- **THEN** the corresponding value SHALL match exactly one of the region strings returned by the Adzuna geodata endpoint for `location0=UK`.

