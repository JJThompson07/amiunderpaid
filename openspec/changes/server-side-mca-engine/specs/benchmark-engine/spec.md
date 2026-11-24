## ADDED Requirements

### Requirement: Single server-side benchmark engine

The system SHALL assemble MCA inputs (role resolution, macro and micro baselines, live histogram) in one server-side engine under `server/utils/engine/`, and every consumer (the amiunderpaid results page and any future API route) MUST obtain those inputs from it rather than assembling them independently.

#### Scenario: Results page obtains its inputs from the engine

- **WHEN** a user loads `/salary/software-engineer/uk/london?compare=45000`
- **THEN** the page's baselines, resolution and live histogram come from one `GET /api/engine/benchmark` response, and the browser makes no direct search-index queries for baselines or role resolution

### Requirement: SOC-keyed role resolution cascade

The engine MUST resolve a role to an occupation code by this cascade, stopping at the first success: a supplied code that exists in `uk_job_groups` / `usa_job_groups`; an exact match of the lowercased title in that collection's `titles` synonyms; a fuzzy search over the country's job-title index; otherwise a generic fallback with no code. The result MUST report the method used, a confidence value, and up to 5 alternatives with distinct occupation groups.

#### Scenario: Code supplied

- **WHEN** the engine is called with `soc=2134` for the UK
- **THEN** resolution is `method: 'soc'` with confidence `1` and no search-index query is made

#### Scenario: Exact synonym

- **WHEN** the engine is called with `title=Actuary` for the UK and `actuary` is in exactly one `uk_job_groups` document's `titles`
- **THEN** resolution is `method: 'synonym'` with that document's code

#### Scenario: Fuzzy match with ambiguity

- **WHEN** the title has no exact synonym and the fuzzy search returns hits spanning three occupation groups
- **THEN** resolution is `method: 'fuzzy'` with the best hit's code, and `alternatives` lists the other groups (at most 5)

#### Scenario: Unknown supplied code

- **WHEN** the engine is called with a `soc` that has no `uk_job_groups` document
- **THEN** it falls through to title resolution if a title was given, and otherwise returns `method: 'generic'`

### Requirement: Baselines read from the source of truth for one data year

The engine MUST read benchmark baselines from Firestore `salary_benchmarks` / `regional_salary_benchmarks`, MUST select exactly one data year per result as defined in `regional-benchmark-data`, and SHALL cache baselines in a bounded, expiring in-memory cache.

#### Scenario: Two data years present

- **WHEN** Firestore holds 2025 and 2026 national records for SOC 2134
- **THEN** `microNational` is the 2026 record and any regional figure returned is also 2026

#### Scenario: Cache stays bounded

- **WHEN** the engine has served more distinct (country, code, location) keys than the cache's maximum entry count
- **THEN** the cache's entry count does not exceed that maximum

### Requirement: UK regional modifier uses the regional all-roles median

For a UK request with a location, the engine MUST look up that location's all-roles regional median (the seeded regional records titled `All`) and pass it as `regionalMedianAllRoles`, so the regional modifier reflects the location rather than defaulting to 1.0.

#### Scenario: London request

- **WHEN** a UK request for location `London` is scored and the newest London all-roles median is 53,132 against a national median of 40,911
- **THEN** the regional modifier used for the score is 53,132 / 40,911 (≈1.30), not 1.0

#### Scenario: Location without regional data

- **WHEN** a UK request names a location with no seeded regional all-roles record
- **THEN** `regionalMedianAllRoles` is null and the modifier is 1.0, as today

### Requirement: Live tier failure does not fail the benchmark

If the live market histogram is unavailable (every provider failed), the engine MUST still return resolution and baselines, with `live: null`, and SHALL compute the score from the remaining tiers.

#### Scenario: All live providers fail

- **WHEN** the live histogram lookup returns a 503
- **THEN** the engine responds 200 with `live: null` and a score computed with zero live jobs

### Requirement: Engine endpoint validates input with opaque errors

`GET /api/engine/benchmark` MUST reject a missing or unsupported country, or a request with neither title nor code, with a 400 whose message names no provider, index or collection.

#### Scenario: No role given

- **WHEN** the endpoint is called with `country=UK` and neither `title` nor `soc`
- **THEN** it responds 400 with a generic validation message

### Requirement: Suggestions record their source

Every write to `job_suggestions` MUST carry a `source` field identifying its origin (`site` for automatic matches from the results page, `user` for user-submitted corrections), and the admin suggestions list SHALL display it.

#### Scenario: Automatic match recorded

- **WHEN** the results page records an automatic title→code match
- **THEN** the created or incremented `job_suggestions` document has `source: 'site'`
