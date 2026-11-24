## MODIFIED Requirements

### Requirement: Homepage CTA

The system SHALL display a Call to Action on the homepage to drive traffic to the Industry Trends hub.

#### Scenario: User views the homepage

- **WHEN** the user scrolls through the amiunderpaid homepage (`app/pages/index.vue`, which renders only the amiunderpaid home; benchmarkmyrole's `/` is the separate developer landing page and has no consumer homepage)
- **THEN** they see a dedicated section with preamble text discussing industry comparisons and a CTA button linking to `/insights/industry-trends`.
