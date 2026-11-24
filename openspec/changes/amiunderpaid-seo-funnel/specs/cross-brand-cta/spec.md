## ADDED Requirements

### Requirement: BenchmarkMyRole links on amiunderpaid

amiunderpaid SHALL link to `https://www.benchmarkmyrole.com` as "For employers & developers" in the main navigation and the footer, and SHALL show a "use this data in your product" panel on `/data-sources`, `/mca-score` and `/explorer`. Each link MUST carry `utm_source=amiunderpaid` and a `utm_medium` naming its placement, and all copy MUST come from i18n files.

#### Scenario: Footer link

- **WHEN** a visitor clicks the footer "For employers & developers" link
- **THEN** they go to `https://www.benchmarkmyrole.com/?utm_source=amiunderpaid&utm_medium=footer`

### Requirement: No cross-brand panels on result pages

The BenchmarkMyRole panel MUST NOT be rendered on `/salary/**` or `/jobs/**` pages. Only the global navigation and footer links appear there.

#### Scenario: Salary result page

- **WHEN** a visitor opens any `/salary/...` page
- **THEN** no BenchmarkMyRole panel is present in the page body
