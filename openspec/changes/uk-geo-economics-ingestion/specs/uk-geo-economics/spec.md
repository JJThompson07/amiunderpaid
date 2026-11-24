## ADDED Requirements

### Requirement: UK location resolution without network calls

The system SHALL resolve a UK place name from `ONS_LOCATIONS`, a postcode outcode, or a full postcode to `{ name, gss, level, regionGss, regionName }` using a committed static lookup, and MUST NOT call any external service at request time to do so. Unrecognised input MUST resolve to null.

#### Scenario: Place name

- **WHEN** `resolveUkLocation('Warwickshire')` is called
- **THEN** it returns Warwickshire's GSS code with region West Midlands (`E12000005`)

#### Scenario: Full postcode

- **WHEN** `resolveUkLocation('cv34 4ab')` is called
- **THEN** it resolves via outcode `CV34` to its local authority and region

#### Scenario: Unknown input

- **WHEN** `resolveUkLocation('Atlantis')` is called
- **THEN** it returns null

### Requirement: Every seeded UK location is resolvable

The lookup generator MUST fail if any `ONS_LOCATIONS` entry cannot be matched to a GSS code and region, so the committed lookup always covers every location the site offers.

#### Scenario: A location has no match

- **WHEN** the generator cannot match an `ONS_LOCATIONS` entry
- **THEN** it exits non-zero, listing the unmatched entries, and writes no output file

### Requirement: Monthly economics refresh keeps the last good value

A monthly cron SHALL refresh CPIH and private rents independently. A source that fails to fetch, or whose parsed data fails shape validation, MUST leave its previously stored data unchanged and record a redacted `lastError` on its metadata document.

#### Scenario: Rent file format changes

- **WHEN** the rents source parses fewer than the minimum expected areas
- **THEN** no `uk_rents` document is modified, the rents metadata records the error, CPIH still updates, and the summary email reports the failure

#### Scenario: Unauthorised cron call

- **WHEN** `/api/cron/sync-economics` is called without the correct `CRON_SECRET` bearer token
- **THEN** it responds 401 and performs no fetches

### Requirement: Geo-economics read model

`getGeoEconomics(location)` SHALL return the resolved location, the latest CPIH index with its 12-month change, and the average private rent for the most specific area that has one (local authority, then upper-tier area, then region), stating which area level the rent figure belongs to.

#### Scenario: Local authority without its own rent figure

- **WHEN** the resolved local authority has no `uk_rents` document but its region does
- **THEN** the rent returned is the region's figure, with `level: 'region'`
