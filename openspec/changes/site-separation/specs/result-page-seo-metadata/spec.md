## Purpose

Ensures that amiunderpaid result pages, which are served from a host-agnostic cache, declare the correct canonical URL, alternates and document language for the country they describe, so search engines index UK content on the UK domain and USA content on the US domain.

## ADDED Requirements

### Requirement: Result page canonical follows the route country

For `/salary/<title>/<country>[/<location>]` and `/jobs/<title>/<country>[/<location>]`, the `<link rel="canonical">` URL SHALL be built from the route's country: `https://www.amiunderpaid.co.uk<path>` for `uk` and `https://www.amiunderpaid.com<path>` for `usa`, where `<path>` is the request path without query string. It MUST NOT depend on the request host.

#### Scenario: UK result page canonical

- **WHEN** `/salary/software-engineer/uk` is rendered, whether into a cache entry or live
- **THEN** its canonical link is `https://www.amiunderpaid.co.uk/salary/software-engineer/uk`

#### Scenario: USA result page canonical

- **WHEN** `/salary/software-engineer/usa` is rendered
- **THEN** its canonical link is `https://www.amiunderpaid.com/salary/software-engineer/usa`

### Requirement: Result page document language follows the route country

Result pages SHALL render `<html lang="en-GB">` and en-GB locale strings when the route country is `uk`, and `<html lang="en-US">` and en-US strings when it is `usa`, regardless of the request host.

#### Scenario: UK result page language

- **WHEN** `/salary/actuary/uk` is rendered
- **THEN** the document has `lang="en-GB"`

### Requirement: Country-scoped result pages declare no cross-domain locale alternate

Because a UK result page and a USA result page with the same title describe different data, not translations of each other, a country-scoped result page MUST NOT emit `hreflang` alternates pointing at the same path on the other country's domain.

#### Scenario: UK result page alternates

- **WHEN** `/salary/actuary/uk` is rendered
- **THEN** the page has no `<link rel="alternate" hreflang="en-US">` pointing at `https://www.amiunderpaid.com/salary/actuary/uk`
