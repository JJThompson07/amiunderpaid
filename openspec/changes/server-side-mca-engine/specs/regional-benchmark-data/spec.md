## MODIFIED Requirements

### Requirement: UK regional query returns all matching regions

The benchmark engine's regional lookups (`server/utils/engine/baselines.ts`) SHALL retrieve the regional record for the requested occupation and location deterministically, querying Firestore by exact code and location rather than paging a search index, so no region can be dropped by a result-size cap.

#### Scenario: Occupation present in more than 100 UK regions

- **WHEN** a UK user searches an occupation that has data in more than 100 of the ~400 ONS regions in `utils/locations/uk.ts`
- **THEN** the regional figure for the user's own region SHALL be returned if it exists in Firestore, deterministically across repeated requests

#### Scenario: Regional data exists for a low-population region

- **WHEN** a UK user in a low-population region searches a common occupation
- **THEN** the system SHALL return that region's data rather than silently falling back to normalised national data
