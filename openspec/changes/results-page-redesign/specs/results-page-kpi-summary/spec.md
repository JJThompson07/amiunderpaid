## Purpose

Defines the consolidated KPI summary row shown at the top of the salary/benchmark results pages, and the resulting single-source-of-truth behavior for displaying the user's own salary on that page.

## ADDED Requirements

### Requirement: Single Source of Truth for User's Own Salary

The system SHALL display the user's own entered salary figure exactly once on the results page — inside the KPI summary row — rather than repeating it in each downstream comparison section.

#### Scenario: Results page with both live market and government data

- **WHEN** a results page loads with both live market (Adzuna) data and government (ONS) benchmark data available
- **THEN** the user's own salary figure appears once, in the KPI summary row
- **AND** it does not also appear inside the live market comparison section or the government benchmark section.

### Requirement: KPI Summary Row

The system SHALL display a summary row of up to four cards at the top of the results content, before the MCA score section: the user's own salary; the live market average with its variance from the user's salary; the government benchmark average with its variance from the user's salary; and a highlighted card showing the government 75th-percentile figure as an upside ceiling.

#### Scenario: Full data available

- **WHEN** a results page loads with the user's salary entered, live market data available, and government benchmark data available
- **THEN** all four KPI cards render: user's salary, live market average + variance, government benchmark + variance, and the highlighted 75th-percentile ceiling card.

#### Scenario: No live market data available

- **WHEN** a results page loads with government benchmark data but no live market (Adzuna/Reed/Jooble) data
- **THEN** the live market average card is omitted from the KPI row, and the remaining cards (salary, government benchmark, 75th-percentile ceiling) still render.

#### Scenario: No government benchmark data available

- **WHEN** a results page loads with live market data but no government benchmark data
- **THEN** the government benchmark card and the 75th-percentile ceiling card are both omitted from the KPI row, since the ceiling figure is sourced from government data.

#### Scenario: No user salary entered

- **WHEN** a results page loads before the user has entered a salary to compare
- **THEN** the KPI row shows the available market/benchmark cards without a variance figure, since variance requires a user salary to compare against.

### Requirement: MCA Regional Modifier Breakdown

The system SHALL include the regional cost-of-living modifier as a visible factor in the MCA score's expandable breakdown, alongside the existing live-market, government, and national-economy percentile breakdowns.

#### Scenario: Non-neutral regional modifier

- **WHEN** a user expands the MCA score breakdown and the resolved location has a regional modifier different from the national baseline (modifier not equal to 1)
- **THEN** the breakdown shows the modifier as a distinct factor, indicating whether it raises or lowers the expected baseline for that location.

#### Scenario: No regional modifier available

- **WHEN** a user expands the MCA score breakdown and no regional modifier applies (modifier equal to 1, e.g. no location-specific data resolved)
- **THEN** the modifier factor is omitted from the breakdown rather than shown as a neutral or misleading value.
