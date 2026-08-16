## ADDED Requirements

### Requirement: National Baseline Statistics Bar
The system SHALL display a subtle national baseline statistics bar below the trending searches marquee on the homepage. This bar SHALL display the national average (mean) salary and the 10th/90th percentiles for "All Roles" in the respective country (UK or USA).

#### Scenario: User visits the UK homepage
- **WHEN** a user accesses the UK version of the homepage
- **THEN** they see a statistics bar below the trending roles displaying UK-specific data, such as "National Average (All Roles): £35,000 • Bottom 10%: £22,000 • Top 10%: £65,000".

#### Scenario: User visits the US homepage
- **WHEN** a user accesses the US version of the homepage
- **THEN** they see a statistics bar below the trending roles displaying US-specific data, such as "National Average (All Roles): $59,000 • Bottom 10%: $30,000 • Top 10%: $120,000".
