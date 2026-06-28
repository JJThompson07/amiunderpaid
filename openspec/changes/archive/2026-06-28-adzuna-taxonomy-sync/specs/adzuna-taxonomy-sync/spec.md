## ADDED Requirements

### Requirement: Adzuna taxonomy discovery endpoint

The system SHALL provide an admin-only API route at `/api/admin/adzuna-locations` that fetches the Adzuna API's UK location taxonomy and returns the exact region name strings used by the API.

#### Scenario: Fetching UK region names from Adzuna

- **WHEN** an authenticated admin calls `GET /api/admin/adzuna-locations?country=gb`
- **THEN** the system SHALL call the Adzuna API with `location0=UK`, extract the child region names from the response, and return them as a JSON array of strings.

## ADDED Requirements

### Requirement: Adzuna API Location Adapter

The location adapter map in `server/constants/locations.ts` SHALL use strings that are verified against the actual Adzuna API taxonomy responses, not guessed values.

#### Scenario: Internal slug 'east' maps to the API-verified region name

- **WHEN** the API route receives a `location` query parameter of `"east"`
- **THEN** the adapter SHALL map it to the exact string returned by the Adzuna API for the eastern England region (to be confirmed by the discovery script — expected to be `"Eastern England"` or `"East of England"`).

#### Scenario: All mapped values are API-verified

- **WHEN** any slug in `ADZUNA_LOCATION_MAP` is looked up
- **THEN** the corresponding value SHALL match exactly one of the region strings returned by the Adzuna geodata endpoint for `location0=UK`.
