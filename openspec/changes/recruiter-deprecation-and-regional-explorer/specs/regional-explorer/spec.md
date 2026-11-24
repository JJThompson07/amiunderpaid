## ADDED Requirements

### Requirement: Public UK pay map by role

The explorer page SHALL let any visitor pick a role and see its pay for each GB region on a map of current ONS boundaries, joined by GSS code. Each region's value MUST show its `basis`, with any non-`regional` value visibly marked as estimated. Northern Ireland MUST be shown as having no regional figure rather than a misleading value. With no role selected, the map SHALL show all-roles median pay by county/unitary authority.

#### Scenario: Role selected

- **WHEN** a visitor opens `/explorer?soc=2134`
- **THEN** the map shades the 11 GB regions by the role's regional pay, marks estimated regions, and shows Northern Ireland as no data

#### Scenario: No role selected

- **WHEN** a visitor opens `/explorer`
- **THEN** the map shades counties and unitary authorities by all-roles median pay

### Requirement: Shareable, cacheable state

The selected role MUST be held in the URL (`soc` query parameter), and the page's rendered output MUST depend only on the path and that parameter, never on the request host, so it can be served from the edge cache.

#### Scenario: Shared link

- **WHEN** a visitor opens a copied `/explorer?soc=2433` link
- **THEN** the same role and map are shown without further interaction

### Requirement: API sample and call to action

Alongside the map, the explorer SHALL show an illustrative `/v1/benchmark` response for the current selection, generated without calling the API or requiring a key, and a link to the BenchmarkMyRole playground. All visible text MUST come from i18n files.

#### Scenario: Visitor wants live data

- **WHEN** a visitor clicks "Try it live"
- **THEN** they are taken to `https://www.benchmarkmyrole.com/playground`

### Requirement: Explorer data endpoint

`GET /api/explorer/regions` SHALL return per-region values with `basis` for a given `soc`, or all-roles values per area when `soc` is absent, SHALL reject a malformed `soc` with 400, and SHALL be cached for 24 hours per `soc`.

#### Scenario: Malformed code

- **WHEN** the endpoint is called with `soc=abc`
- **THEN** it responds 400 with a generic validation message
