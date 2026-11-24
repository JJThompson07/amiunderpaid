## ADDED Requirements

### Requirement: Versioned API on its own host

The public API SHALL be served only at `https://api.benchmarkmyrole.com/v1/...`. Requests for the internal v1 routes on any other host MUST return 404, and any non-`/v1` path on the API host (other than `/openapi.json`) MUST return a JSON 404.

#### Scenario: API path requested on the consumer site

- **WHEN** a client requests `https://www.amiunderpaid.co.uk/api/v1/benchmark?role=actuary&location=leeds`
- **THEN** the response is 404 and no engine work is performed

#### Scenario: OpenAPI document

- **WHEN** a client requests `https://api.benchmarkmyrole.com/openapi.json`
- **THEN** the OpenAPI document is returned without authentication

### Requirement: Benchmark endpoint

`GET /v1/benchmark` SHALL accept a role as `soc` or free-text `role`, a required UK `location` (place name or postcode), and optional `salary`, `strict`, `student_loan` and `tax_region`. It SHALL return the resolved role with its resolution method and confidence, national and regional pay with the regional `basis`, the regional modifier and geo-economic context, plus the MCA score and take-home pay when `salary` is supplied.

#### Scenario: Free-text role with salary

- **WHEN** an authenticated client calls `/v1/benchmark?role=software%20developer&location=M1&salary=52000`
- **THEN** the response is 200 with `data.role.resolution.method`, `data.pay.regional` for North West with its `basis`, `data.score.mca` and `data.takeHome.net`

#### Scenario: Non-UK location

- **WHEN** the location does not resolve to a UK place or postcode
- **THEN** the response is 422 with error code `unsupported_country`

#### Scenario: Strict mode with a fuzzy match

- **WHEN** `strict=true` and the role resolves only by fuzzy search
- **THEN** the response is 422 with error code `role_unresolved` and up to 5 alternatives in the error details

### Requirement: Role search and geo endpoints

`GET /v1/roles/search?q=` SHALL return up to 10 ranked SOC candidates with title, method and confidence. `GET /v1/geo/{location}/economics` SHALL return the geo-economics read model for a UK location, and 404 `not_found` for an unresolvable one.

#### Scenario: Unknown geography

- **WHEN** a client calls `/v1/geo/atlantis/economics`
- **THEN** the response is 404 with error code `not_found`

### Requirement: Consistent envelope, errors and attribution

Every v1 success MUST use the envelope `{ data, meta }`, with `meta` carrying the request id, API version, data year and the list of data sources with their licences. Every v1 error MUST use `{ error: { code, message, requestId } }`, with a message that names no provider, index or internal collection. Every response MUST carry an `X-Request-Id` header.

#### Scenario: Government data attribution

- **WHEN** a benchmark response includes ONS figures
- **THEN** `meta.sources` lists the ONS datasets used with the Open Government Licence v3.0

### Requirement: Live provider data withheld by default

Live job-market data derived from a commercial provider MUST be omitted from every v1 response unless the server-side `apiLiveDataEnabled` flag is true. The flag MUST default to false.

#### Scenario: Flag off

- **WHEN** `apiLiveDataEnabled` is false and the engine produced a live block from Reed
- **THEN** the v1 response contains no `live` field

### Requirement: Fuzzy API resolutions feed the suggestion queue

When a v1 request resolves a role by fuzzy search, the system SHALL record the free-text term and the chosen code in `job_suggestions` with `source: 'api'`, incrementing an existing pending suggestion for the same term, code and country rather than duplicating it.

#### Scenario: Repeated fuzzy term

- **WHEN** two API requests resolve `devops wizard` by fuzzy match to the same code
- **THEN** one pending suggestion exists with `source: 'api'` and `count: 2`
