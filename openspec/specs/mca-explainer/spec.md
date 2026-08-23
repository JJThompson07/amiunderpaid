# mca-explainer Specification

## Purpose

Defines the requirements for the dedicated Market Compensation Alignment (MCA) Score explanation page, ensuring users understand their brackets and receive actionable career advice without exposing the proprietary calculation logic.

## Requirements

### Requirement: MCA Explainer Page

The system SHALL provide a dedicated public page (e.g., `/mca-score` or `/how-it-works/mca`) that explains the concept of the Market Compensation Alignment (MCA) Score.

#### Scenario: User navigates to the MCA Explainer Page

- **WHEN** a user visits the MCA explainer URL
- **THEN** they see a clear, high-level overview of what the MCA Score is and why it matters, without exposing the exact mathematical algorithm used to calculate it.

### Requirement: Bracket Breakdowns and Actionable Advice

The MCA Explainer page SHALL break down the possible MCA brackets (e.g., Below Market, Competitive, Market Leader) and provide specific, actionable advice for users falling into each category.

#### Scenario: User views the bracket breakdown

- **WHEN** a user reads the MCA brackets section
- **THEN** they see definitions for each tier and practical advice on next steps (e.g., "If you are Below Market, consider preparing for a salary negotiation using these data points...").
