# homepage-seo Specification

## Purpose

Enhances the homepage with SEO-optimized headings and a semantic trending searches internal linking component to guarantee proper search engine crawlability and indexing of dynamic salary pages.

## Requirements

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

### Requirement: Semantic SEO headings in the hero section

The system SHALL use keyword-optimized headings in the hero section to ensure search engines properly understand the page's primary value proposition without breaking visual design. Specifically, the system SHALL natively weave targeted SEO keywords into the visible `<h2>` subtitle.

#### Scenario: Search engine parses the hero section

- **WHEN** a search engine parses the hero section
- **THEN** it finds a semantic visible heading containing primary keywords such as "UK Salary Checker & Market Pay Calculator" (or the US equivalent).

### Requirement: National Baseline Statistics Bar

The system SHALL display a subtle national baseline statistics bar below the trending searches marquee on the homepage. This bar SHALL display the national average (mean) salary and the 10th/90th percentiles for "All Roles" in the respective country (UK or USA).

#### Scenario: User visits the UK homepage

- **WHEN** a user accesses the UK version of the homepage
- **THEN** they see a statistics bar below the trending roles displaying UK-specific data, such as "National Average (All Roles): £35,000 • Bottom 10%: £22,000 • Top 10%: £65,000".

#### Scenario: User visits the US homepage

- **WHEN** a user accesses the US version of the homepage
- **THEN** they see a statistics bar below the trending roles displaying US-specific data, such as "National Average (All Roles): $59,000 • Bottom 10%: $30,000 • Top 10%: $120,000".
