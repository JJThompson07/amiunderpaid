## MODIFIED Requirements

### Requirement: Results Page Color Hierarchy

The system SHALL ensure that the MCA Score card and the highlighted 75th-percentile KPI card remain the primary colorful focal points on the results page, preventing a clash of semantic colors from secondary data sources.

#### Scenario: User views the salary results page

- **WHEN** the results page loads with both MCA, Adzuna, and Government data
- **THEN** the MCA score card and the highlighted 75th-percentile KPI card use a full semantic background color
- **AND** the remaining KPI row cards and the secondary live-market/government comparison sections use neutral backgrounds with small colored indicator badges.

### Requirement: Results Page Card Density

The system SHALL structure the KPI summary row and the secondary data cards (Adzuna, Government) to efficiently use horizontal space without looking awkwardly empty on wide screens, and without repeating the user's own salary figure outside the KPI summary row.

#### Scenario: User views results on a desktop

- **WHEN** a user views the results page on a large monitor
- **THEN** the KPI summary row renders as a multi-column grid
- **AND** the secondary live-market/government comparison sections use rich iconography and compact data layouts (e.g. histogram, percentile slider) to fill their card bounds, without re-displaying the user's own salary figure.
