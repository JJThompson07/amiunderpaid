# Spec Delta

## ADDED Requirements

### Requirement: View more roles link beneath the job listings carousel

The job listings section on the salary and benchmark results pages SHALL display a "View more roles" link positioned beneath the job listings carousel, right-aligned, whenever the carousel has at least one listing. The link SHALL navigate to the `/jobs` search results route for the same title, country, and (when present) location as the results page currently being viewed.

#### Scenario: Results page has job listings

- **WHEN** a user views the salary or benchmark results page for a title/country (optionally with a location) and the job listings carousel renders at least one listing
- **THEN** a "View more roles" link is shown beneath the carousel, right-aligned, that navigates to `/jobs/[title]/[country]` or `/jobs/[title]/[country]/[location]` for that same title, country, and location

#### Scenario: Results page has no job listings

- **WHEN** a user views the salary or benchmark results page and the job listings carousel has no listings to display
- **THEN** the "View more roles" link is not rendered
