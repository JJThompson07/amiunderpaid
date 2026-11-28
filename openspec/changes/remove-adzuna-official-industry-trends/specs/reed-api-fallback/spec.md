## MODIFIED Requirements

### Requirement: Reed API Category Filtering via Keyword Enhancement

The Reed utility (`server/utils/reed.ts`) SHALL accept an optional category parameter, turn the category tag into a plain-language keyword, and fold it into the `keywords` query sent to the Reed.co.uk API.

#### Scenario: Executing Reed fallback with category

- **WHEN** a UK market-data request specifies an industry category (e.g. `it-jobs`)
- **THEN** the system SHALL forward the category to `fetchReedData` and append the category term to `keywords` to refine results within that industry.

### Requirement: Geographic API Routing

The `market-data` API Gateway SHALL route job and salary requests dynamically based on the target region:

- UK Traffic: Routes exclusively to the Reed API. When Reed returns zero results or fails, the system MUST NOT query another job board and SHALL fall back to official ONS data.
- USA Traffic: Routes primarily to the Careerjet API, falling back to the Jooble API on zero results or API failure, and to official BLS data when both fail. When the providers answer with zero results, the system SHALL return an empty result, not an error.

#### Scenario: UK Geographic Routing

- **WHEN** a user requests market data for the UK (`country: gb`)
- **THEN** the system SHALL fetch from Reed and return the results with `provider: 'reed'`.

#### Scenario: UK Geographic Routing when Reed returns zero results or fails

- **WHEN** a user requests market data for the UK (`country: gb`) and Reed returns 0 results or encounters an upstream error
- **THEN** the system MUST NOT call Adzuna or any other secondary job board
- **AND** a zero-result response SHALL be returned as an empty `provider: 'reed'` result cached for `config.liveCacheFallbackTtlHours` hours, while an upstream error SHALL return 503 (opaque message, §9.3)
- **AND** the benchmark engine SHALL compute the result from official ONS baselines alone (`live: null`).

#### Scenario: USA Geographic Routing

- **WHEN** a user requests market data for the USA (`country: us`)
- **THEN** the system SHALL attempt to fetch from Careerjet first, and if 0 results are returned or the API fails, fall back to the Jooble API.
