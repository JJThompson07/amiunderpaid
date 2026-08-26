## Purpose

Transform the Industry Trends feature into a Programmatic SEO (pSEO) engine to capture long-tail, high-intent search traffic for specific industries, while driving user engagement via a homepage CTA.

## Requirements

### Requirement: Homepage CTA

The system SHALL display a Call to Action on the homepage to drive traffic to the Industry Trends hub.

#### Scenario: User views the homepage

- **WHEN** the user scrolls through the homepage (`app/components/Brand/AmI/Home.vue` or `app/components/Brand/Benchmark/Home.vue`, depending on `$siteBrand` — `app/pages/index.vue` only delegates to one of these)
- **THEN** they see a dedicated section with preamble text discussing industry comparisons and a CTA button linking to `/insights/industry-trends`.

### Requirement: Programmatic Industry Pages

The system SHALL dynamically generate a unique landing page for every tracked industry to target exact-match search queries.

#### Scenario: Google crawls an industry page

- **WHEN** a crawler requests `/insights/industry-trends/it-jobs`
- **THEN** the system returns a page with highly optimized metadata (`<title>`, `<meta name="description">`) and `<h1>` tags specifically asking/answering questions about the "IT" industry market trends.
- **AND** the page prominently displays the trends graph pre-filtered to highlight the IT industry.

### Requirement: Dynamic Sitemap

The system SHALL automatically include all programmatic industry pages in the `sitemap.xml`.

#### Scenario: Sitemap generation

- **WHEN** the `/sitemap.xml` route is requested
- **THEN** the server fetches all active categories from the database and appends `/insights/industry-trends/{category.tag}` to the generated XML.
