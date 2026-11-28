## MODIFIED Requirements

### Requirement: Programmatic Industry Pages

The system SHALL dynamically generate a unique landing page for every surviving SIC/NAICS industry in `industry_trends`, and SHALL permanently redirect (HTTP 301) any dropped legacy job-type category slug under `/insights/industry-trends/[industry]` to its mapped surviving industry page or the `/insights/industry-trends` hub so existing search engine links do not break.

#### Scenario: Google crawls an industry page

- **WHEN** a crawler requests `/insights/industry-trends/it-jobs`
- **THEN** the system returns a 200 page with optimized metadata (`<title>`, `<meta name="description">`) and `<h1>` tags for that industry
- **AND** the page prominently displays the trends graph pre-filtered to `it-jobs`.

#### Scenario: Visitor or crawler requests a dropped job-type category URL

- **WHEN** a crawler or user requests `/insights/industry-trends/engineering-jobs` or `/insights/industry-trends/sales-jobs`
- **THEN** the system SHALL respond with a 301 redirect to the mapped surviving industry URL (`/insights/industry-trends/professional-services-jobs`) or the `/insights/industry-trends` hub respectively.

#### Scenario: Visitor requests an industry with no data for the host's country

- **WHEN** a user requests `/insights/industry-trends/property-jobs`, `public-sector-jobs`, or `agriculture-jobs` on a USA host (these industries have no BLS CES series)
- **THEN** the system SHALL respond with a 301 redirect to the `/insights/industry-trends` hub, and the sitemap SHALL NOT list that URL for the USA host.

#### Scenario: Visitor requests an unknown slug that was never a category

- **WHEN** a user requests `/insights/industry-trends/nonexistent-slug`
- **THEN** the system SHALL respond with a 404 status code.

### Requirement: Dynamic Sitemap

The system SHALL automatically include all active programmatic industry pages from `industry_trends` in `sitemap.xml`, excluding dropped category slugs.

#### Scenario: Sitemap generation

- **WHEN** the `/sitemap.xml` route is requested on an amiunderpaid host
- **THEN** the server fetches active categories for that host's country from `industry_trends` and appends `/insights/industry-trends/{categoryTag}` to the generated XML.
