# homepage-informational Specification

## Purpose

Defines the requirements for the informational sections on the homepage, including the About, How it works, and FAQ sections, to ensure high user engagement, clarity, and good user experience.

## Requirements

### Requirement: Informational Content Sections

The system SHALL display an "About" section and a "How it works" section on the homepage that clearly articulates the value proposition and mechanics of the platform.

#### Scenario: User views the About section

- **WHEN** a user scrolls to the About section
- **THEN** they see engaging content explaining the platform's mission and benefits

#### Scenario: User views the How it works section

- **WHEN** a user scrolls to the "How it works" section
- **THEN** they see a clear, visually engaging breakdown (such as a bento grid or rich cards with dedicated space for illustrations) explaining how the platform calculates and displays salary data, rather than a basic vertical timeline.

### Requirement: FAQ Accordion UX

The system SHALL display FAQs using an accordion component that smoothly expands and collapses without causing jumpy page layout shifts.

#### Scenario: User toggles an FAQ item

- **WHEN** a user clicks on an FAQ question
- **THEN** the answer expands smoothly without causing abrupt page jumps

### Requirement: FAQ Search Functionality

The system SHALL provide a search input above the FAQ section that allows users to instantly filter FAQ items based on keyword matches in either the question or the answer.

#### Scenario: User searches for a specific FAQ

- **WHEN** a user types a keyword into the FAQ search input
- **THEN** the FAQ list filters to only show items containing that keyword in the question or answer

### Requirement: Career and Role FAQs

The system SHALL include FAQ entries specifically addressing common career and role-based queries to aid users and improve SEO.

#### Scenario: User views role-specific FAQs

- **WHEN** a user browses or searches the FAQs
- **THEN** they find answers related to typical career progression, salary negotiation, and specific roles

### Requirement: FAQ Structured Data for SEO

The system SHALL output valid Schema.org `FAQPage` structured data (JSON-LD) containing all the FAQ questions and answers rendered on the page, to ensure search engines can parse and display them as rich snippets.

#### Scenario: Search engine bot crawls the homepage

- **WHEN** a search engine parses the homepage HTML
- **THEN** it finds a JSON-LD script block containing `"@type": "FAQPage"` and a `mainEntity` array mapping to the visible questions and answers.
