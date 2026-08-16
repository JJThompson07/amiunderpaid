## MODIFIED Requirements

### Requirement: Trending Searches grid on the homepage
The system SHALL display a continuous horizontal rolling marquee of trending searches on the homepage, below the main content. The marquee SHALL display the job title and the mean national salary (e.g., "Software Engineer - £55,000") and contain direct links to highly-searched salary pages. The animation SHALL pause when the user hovers over the marquee.

#### Scenario: User visits the UK homepage
- **WHEN** a user or search engine accesses the UK version of the homepage
- **THEN** they see a "Popular UK Salaries" (or similar) section containing a continuous marquee of `NuxtLink` components that point to `/salary/[role]/UK`, displaying GBP (£) currency values.

#### Scenario: User visits the US homepage
- **WHEN** a user or search engine accesses the US version of the homepage
- **THEN** they see a "Popular US Salaries" (or similar) section containing a continuous marquee of `NuxtLink` components that point to `/salary/[role]/USA`, displaying USD ($) currency values.

#### Scenario: User hovers over the marquee
- **WHEN** the user hovers their mouse pointer over the scrolling marquee
- **THEN** the scrolling animation pauses to allow the user to easily click a link.
