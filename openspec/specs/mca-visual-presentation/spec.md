# mca-visual-presentation Specification

## Purpose

Defines the requirements for the visual presentation and structured advice rendering on the MCA Explainer page, ensuring data is easy to digest and doesn't feel machine-generated.

## Requirements

### Requirement: Inline MCA Bracket Spectrum Gauge

The system SHALL display a visual indicator (such as a segmented mini progress bar or gauge) inside each MCA bracket card. The gauge MUST represent the full 1-99 spectrum, but only highlight the segment corresponding to that specific card, leaving the other segments muted.

#### Scenario: User views a specific MCA bracket card

- **WHEN** a user looks at an individual MCA bracket card
- **THEN** they see an inline visual spectrum bar where only the card's specific range (e.g., "Competitive") is highlighted with color, while the rest of the bar is grayed out.

### Requirement: Bulleted Audience Advice

The system SHALL format the advice given for each bracket as discrete, actionable bullet points segmented by audience (Candidates vs. Employers), replacing any dense, semicolon-separated strings.

#### Scenario: User reads bracket advice

- **WHEN** a user reads the advice block for a specific bracket
- **THEN** they see bulleted text clearly separating the advice intended for candidates from the advice intended for employers.
