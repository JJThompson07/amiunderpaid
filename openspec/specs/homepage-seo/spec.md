# homepage-seo Specification

## Purpose
Enhances the homepage with SEO-optimized headings and a semantic trending searches internal linking component to guarantee proper search engine crawlability and indexing of dynamic salary pages.

## Requirements

### Requirement: Trending Searches grid on the homepage
The system SHALL display a grid of trending searches on the homepage, below the main content, containing direct links to highly-searched salary pages.

#### Scenario: User visits the UK homepage
- **WHEN** a user or search engine accesses the UK version of the homepage
- **THEN** they see a "Popular UK Salaries" (or similar) grid containing `NuxtLink` components that point to `/salary/[role]/UK`

#### Scenario: User visits the US homepage
- **WHEN** a user or search engine accesses the US version of the homepage
- **THEN** they see a "Popular US Salaries" (or similar) grid containing `NuxtLink` components that point to `/salary/[role]/USA`

### Requirement: Semantic SEO headings in the hero section
The system SHALL use keyword-optimized headings (e.g., `<h2 class="visually-hidden">`) in the hero section to ensure search engines properly understand the page's primary value proposition without breaking visual design.

#### Scenario: Search engine parses the hero section
- **WHEN** a search engine parses the hero section
- **THEN** it finds a semantic heading containing primary keywords such as "UK Salary Checker & Market Pay Calculator" (or the US equivalent).
